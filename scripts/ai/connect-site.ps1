# PREPARED ONLY: -Apply exposes the authenticated gateway through a temporary
# Quick Tunnel. It never publishes secrets or exposes raw Ollama. Obtain the
# explicit public-exposure approval before using -Apply.
param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runtimeDirectory = Join-Path $projectRoot '.tmp/ai-runtime'
$stateFile = Join-Path $runtimeDirectory 'processes.json'
$privateFile = Join-Path $runtimeDirectory 'gateway.private.json'
$tunnelExecutable = Join-Path $runtimeDirectory 'cloudflared.exe'
$ollamaExecutable = Join-Path $runtimeDirectory 'ollama/ollama.exe'
$gatewayScript = Join-Path $PSScriptRoot 'local-gateway.mjs'
$lockFile = Join-Path $runtimeDirectory 'processes.connection.lock'
$expectedHash = 'db4e4c413612a0916f3e1679d3caaf376f94911952d163028fb726fb2e0516a9'
$target = 'http://127.0.0.1:11435'
$model = 'qwen3:1.7b'
$lockHandle = $null
$launchedRecord = $null
$processState = @{}
$stage = 'preflight'

function Read-SharedLog([string]$file) {
  $stream = [IO.File]::Open($file, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    if ($stream.Length -gt 524288) { throw 'tunnel_log_limit' }
    $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::UTF8)
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
  } finally { $stream.Dispose() }
}

function Assert-PlainWorkspacePath([string]$candidate) {
  $absolute = [IO.Path]::GetFullPath($candidate)
  if (!$absolute.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'unsafe_path' }
  $current = $absolute
  while ($current -and $current -ne $projectRoot) {
    if (Test-Path -LiteralPath $current) {
      if (((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'unsafe_path' }
    }
    $current = [IO.Path]::GetDirectoryName($current)
  }
}
function Set-PrivateAcl([string]$file) {
  $acl = Get-Acl -LiteralPath $file
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($rule in @($acl.Access)) { [void]$acl.RemoveAccessRuleSpecific($rule) }
  $owner = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $acl.SetAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($owner, 'FullControl', 'Allow')))
  $acl.SetAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier('S-1-5-18')), 'FullControl', 'Allow')))
  Set-Acl -LiteralPath $file -AclObject $acl
}
function Assert-PrivateAcl([string]$file) {
  $acl = Get-Acl -LiteralPath $file
  $owner = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  if (!$acl.AreAccessRulesProtected) { throw 'private_acl_required' }
  foreach ($rule in $acl.Access) {
    $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
    if ($rule.AccessControlType -eq 'Allow' -and $sid -notin @($owner, 'S-1-5-18')) { throw 'private_acl_required' }
  }
}
function New-PrivateFile([string]$file) {
  Assert-PlainWorkspacePath $file
  $handle = [IO.File]::Open($file, [IO.FileMode]::CreateNew); $handle.Dispose()
  Set-PrivateAcl $file
}
function Save-State {
  $temporary = Join-Path $runtimeDirectory ('processes-' + [Guid]::NewGuid().ToString('N') + '.private.tmp')
  New-PrivateFile $temporary
  [IO.File]::WriteAllText($temporary, ($script:processState | ConvertTo-Json -Depth 10), (New-Object Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $temporary -Destination $stateFile -Force
}
function Test-ExactArgument([string]$command, [string]$argument) {
  $expected = [regex]::Escape($argument.Replace('\', '/'))
  return [regex]::IsMatch($command.Replace('\', '/'), '(?i)(?:^|\s)(?:"' + $expected + '"|' + $expected + ')(?=\s|$)')
}
function Assert-NoTunnelOverrides($environmentNames, $configurationFiles) {
  if (@($environmentNames | Where-Object { $_ -match '^(?:TUNNEL_|CLOUDFLARED_|CF_TUNNEL_)' }).Count -gt 0 -or
    @($configurationFiles).Count -gt 0) { throw 'ambient_tunnel_configuration_requires_review' }
}
function Owned-Process($record, [string]$expectedPath, [string]$kind) {
  if (!$record -or !$record.executable -or ![IO.Path]::IsPathRooted([string]$record.executable) -or
    ![string]::Equals([IO.Path]::GetFullPath([string]$record.executable), $expectedPath, [StringComparison]::OrdinalIgnoreCase)) { throw 'process_owner_mismatch' }
  [long]$processId = 0
  if (![long]::TryParse([string]$record.id, [ref]$processId) -or $processId -lt 1) { throw 'process_owner_mismatch' }
  $process = Get-Process -Id $processId -ErrorAction Stop
  if (![string]::Equals($process.Path, $expectedPath, [StringComparison]::OrdinalIgnoreCase) -or
    $process.StartTime.ToUniversalTime().ToString('o') -ne $record.startedAt) { throw 'process_owner_mismatch' }
  $command = (Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $processId) -ErrorAction Stop).CommandLine
  if (!$command) { throw 'process_owner_mismatch' }
  $normalized = $command.Replace('\', '/')
  $configArgument = [regex]::Escape($privateFile.Replace('\', '/'))
  if ($kind -eq 'gateway' -and (!(Test-ExactArgument $command $gatewayScript) -or
    ![regex]::IsMatch($normalized, '(?i)(?:^|\s)--config\s+(?:"' + $configArgument + '"|' + $configArgument + ')(?=\s|$)'))) { throw 'process_owner_mismatch' }
  if ($kind -eq 'ollama' -and !(Test-ExactArgument $command 'serve')) { throw 'process_owner_mismatch' }
  if ($kind -eq 'tunnel' -and (!(Test-ExactArgument $command 'tunnel') -or
    ![regex]::IsMatch($command, '(?:^|\s)--url\s+http://127\.0\.0\.1:11435(?=\s|$)') -or
    ![regex]::IsMatch($command, '(?:^|\s)--protocol\s+http2(?=\s|$)') -or !(Test-ExactArgument $command '--no-autoupdate'))) { throw 'process_owner_mismatch' }
  $null = $process.Handle
  return $process
}

try {
  if ($args.Count -ne 0) { throw 'unsupported_arguments' }
  if (!$Apply) {
    @{ mode = 'offline_plan'; applyRequired = $true; publicExposureApprovalRequired = $true;
       tunnelVersion = '2026.10.5'; tunnelSha256 = $expectedHash; target = $target; model = $model;
       exposesRawOllama = $false; bearerRequired = $true; publicTunnelStarted = $false; siteSecretsChanged = $false;
       temporaryDevelopmentTunnel = $true; serviceLevelAgreement = $false;
       followUp = 'Review publish-connection.py --plan separately; only --apply changes the five AI secrets.' } | ConvertTo-Json
    return
  }
  foreach ($file in @($runtimeDirectory, $stateFile, $privateFile, $tunnelExecutable, $ollamaExecutable, $gatewayScript)) { Assert-PlainWorkspacePath $file }
  Assert-PrivateAcl $privateFile
  if ((Get-Item -LiteralPath $privateFile).Length -gt 8192 -or (Get-Item -LiteralPath $stateFile).Length -gt 32768) { throw 'configuration_invalid' }
  $configuration = Get-Content -LiteralPath $privateFile -Raw | ConvertFrom-Json
  $names = @($configuration.PSObject.Properties.Name | Sort-Object)
  if (($names -join ',') -ne 'model,port,token' -or $configuration.model -ne $model -or $configuration.port -ne 11435 -or
    $configuration.token -cnotmatch '^[A-Za-z0-9_-]{43,256}$' -or @($configuration.token.ToCharArray() | Select-Object -Unique).Count -lt 10) { throw 'configuration_invalid' }
  if ((Get-Item -LiteralPath $tunnelExecutable).Length -ne 55343328 -or
    (Get-FileHash -LiteralPath $tunnelExecutable -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'runtime_hash_mismatch' }
  $lockHandle = [IO.File]::Open($lockFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  Set-PrivateAcl $lockFile
  $saved = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
  foreach ($property in $saved.PSObject.Properties) { $processState[$property.Name] = $property.Value }
  $nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
  [void](Owned-Process $processState['ollama'] $ollamaExecutable 'ollama')
  [void](Owned-Process $processState['gateway'] $nodeExecutable 'gateway')
  if ($processState.ContainsKey('tunnel') -and $processState['tunnel']) { throw 'recorded_tunnel_requires_review_or_stop' }
  # Do not inherit a named-tunnel token/configuration or unrelated ingress rules.
  # Only check filenames and variable names; never read their credential values.
  $profileDirectory = [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
  $configurationFiles = @(
    (Join-Path $profileDirectory '.cloudflared/config.yml'), (Join-Path $profileDirectory '.cloudflared/config.yaml'),
    (Join-Path $runtimeDirectory 'config.yml'), (Join-Path $runtimeDirectory 'config.yaml')
  ) | Where-Object { Test-Path -LiteralPath $_ }
  Assert-NoTunnelOverrides @([Environment]::GetEnvironmentVariables('Process').Keys) @($configurationFiles)
  $health = Invoke-RestMethod -Uri ($target + '/health') -Method Get -TimeoutSec 3 -MaximumRedirection 0 -Headers @{ Authorization = 'Bearer ' + $configuration.token }
  if ($health.ok -ne $true -or $health.ready -ne $true -or $health.model -ne $model) { throw 'local_gateway_not_ready' }
  $tag = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffffffZ') + '-' + [Guid]::NewGuid().ToString('N')
  $stdout = Join-Path $runtimeDirectory ('tunnel-' + $tag + '.stdout.private.log')
  $stderr = Join-Path $runtimeDirectory ('tunnel-' + $tag + '.stderr.private.log')
  New-PrivateFile $stdout; New-PrivateFile $stderr
  $process = Start-Process -FilePath $tunnelExecutable -ArgumentList @('tunnel', '--url', $target, '--protocol', 'http2', '--no-autoupdate') -WorkingDirectory $runtimeDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  $stage = 'record_new_process'
  $process.Refresh()
  $launchedRecord = @{ id = $process.Id; startedAt = $process.StartTime.ToUniversalTime().ToString('o'); executable = $tunnelExecutable; target = $target; url = $null }
  $processState['tunnel'] = $launchedRecord
  Save-State
  [void](Owned-Process $launchedRecord $tunnelExecutable 'tunnel')
  $stage = 'read_tunnel_origin'
  $url = $null
  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    $process.Refresh(); if ($process.HasExited) { throw 'tunnel_did_not_start' }
    $text = (Read-SharedLog $stdout) + (Read-SharedLog $stderr)
    $tunnelMatches = [regex]::Matches($text, 'https://[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.trycloudflare\.com(?=[/\s|]|$)')
    $origins = @($tunnelMatches | ForEach-Object { $_.Value } | Select-Object -Unique)
    if ($origins.Count -gt 1) { throw 'ambiguous_tunnel_origin' }
    if ($origins.Count -eq 1) { $url = $origins[0]; break }
    Start-Sleep -Milliseconds 500
  }
  if (!$url) { throw 'tunnel_origin_missing' }
  $launchedRecord['url'] = $url
  $launchedRecord['createdAt'] = [DateTime]::UtcNow.ToString('o')
  Save-State
  @{ publicTunnelStarted = $true; publicOrigin = $url; bearerRequired = $true; exposesRawOllama = $false;
     siteSecretsChanged = $false; temporaryDevelopmentTunnel = $true; serviceLevelAgreement = $false } | ConvertTo-Json
} catch {
  if ($launchedRecord) {
    try {
      $owned = Owned-Process $launchedRecord $tunnelExecutable 'tunnel'
      Stop-Process -InputObject $owned -Force -ErrorAction Stop
      $processState.Remove('tunnel'); Save-State
    } catch { # Only the exact newly launched process is eligible for cleanup.
    }
  }
  $safeReason = if ($_.Exception.Message -cmatch '^[a-z_]{1,64}$') { $_.Exception.Message } else { 'runtime_check_failed' }
  @{ error = 'site_connection_failed'; stage = $stage; reason = $safeReason; detailsWithheld = $true; siteSecretsChanged = $false } | ConvertTo-Json -Compress
  exit 1
} finally {
  if ($lockHandle) { $lockHandle.Dispose(); Remove-Item -LiteralPath $lockFile -Force -ErrorAction SilentlyContinue }
}
