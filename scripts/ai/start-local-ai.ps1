# Local-only startup. This file has no tunnel or production configuration path.
param()
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runtimeDirectory = Join-Path $projectRoot '.tmp/ai-runtime'
$stateFile = Join-Path $runtimeDirectory 'processes.json'
$privateFile = Join-Path $runtimeDirectory 'gateway.private.json'
$ollamaExecutable = Join-Path $runtimeDirectory 'ollama/ollama.exe'
$gatewayScript = Join-Path $PSScriptRoot 'local-gateway.mjs'
$lockFile = Join-Path $runtimeDirectory 'processes.connection.lock'
$lockHandle = $null
$model = 'qwen3:1.7b'

function Save-State {
  $script:processState | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $stateFile -Encoding UTF8
}
function Is-OwnedProcess($record, $expectedPath) {
  if (!$record) { return $false }
  $process = Get-Process -Id $record.id -ErrorAction SilentlyContinue
  return $process -and $process.Path -eq $expectedPath -and $process.StartTime.ToUniversalTime().ToString('o') -eq $record.startedAt
}
function Remember-Process($name, $process, $expectedPath) {
  $script:processState[$name] = @{ id = $process.Id; startedAt = $process.StartTime.ToUniversalTime().ToString('o'); executable = $expectedPath }
  Save-State
}
function Port-Occupied([int]$port) {
  $client = New-Object Net.Sockets.TcpClient
  try { $task = $client.ConnectAsync('127.0.0.1', $port); return $task.Wait(500) -and $client.Connected }
  catch { return $false }
  finally { $client.Dispose() }
}
function Read-LocalJson($url, $headers = @{}) {
  return Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 3 -Method Get
}

try {
if (!$runtimeDirectory.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Runtime path is outside this project.' }
foreach ($candidate in @((Join-Path $projectRoot '.tmp'), $runtimeDirectory, $privateFile, $stateFile)) {
  if ((Test-Path -LiteralPath $candidate) -and ((Get-Item -LiteralPath $candidate -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Redirected runtime paths are not permitted.' }
}
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
$lockHandle = [IO.File]::Open($lockFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
foreach ($file in @($ollamaExecutable, $gatewayScript)) {
  if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw 'Install the reviewed portable runtime and gateway before starting.' }
}
$signature = Get-AuthenticodeSignature -LiteralPath $ollamaExecutable
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Ollama Inc\.') { throw 'Ollama executable signature could not be verified.' }

if (!(Test-Path -LiteralPath $privateFile)) {
  $empty = [IO.File]::Open($privateFile, [IO.FileMode]::CreateNew); $empty.Dispose()
  $acl = Get-Acl -LiteralPath $privateFile
  $acl.SetAccessRuleProtection($true, $false)
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $acl.SetAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'Allow')))
  $acl.SetAccessRule((New-Object Security.AccessControl.FileSystemAccessRule('SYSTEM', 'FullControl', 'Allow')))
  Set-Acl -LiteralPath $privateFile -AclObject $acl
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($bytes); $rng.Dispose()
  $token = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  $configuration = @{ token = $token; model = $model; port = 11435 }
  [IO.File]::WriteAllText($privateFile, ($configuration | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
}
$configuration = Get-Content -LiteralPath $privateFile -Raw | ConvertFrom-Json
if ($configuration.model -ne $model -or $configuration.port -ne 11435 -or $configuration.token -notmatch '^[A-Za-z0-9_-]{43}$') { throw 'Gateway private configuration differs from the reviewed setup.' }
$headers = @{ Authorization = 'Bearer ' + $configuration.token }
$processState = @{}
if (Test-Path -LiteralPath $stateFile) {
  $saved = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
  foreach ($property in $saved.PSObject.Properties) { $processState[$property.Name] = $property.Value }
}

if (!(Is-OwnedProcess $processState['ollama'] $ollamaExecutable)) {
  if (Port-Occupied 11434) { throw 'Port 11434 belongs to another process; no process was stopped.' }
  $variables = @{
    OLLAMA_HOST = '127.0.0.1:11434'; OLLAMA_MODELS = (Join-Path $runtimeDirectory 'models');
    OLLAMA_NO_CLOUD = '1'; OLLAMA_NUM_PARALLEL = '1'; OLLAMA_MAX_LOADED_MODELS = '1';
    OLLAMA_MAX_QUEUE = '2'; OLLAMA_CONTEXT_LENGTH = '4096'; OLLAMA_KEEP_ALIVE = '5m'; OLLAMA_DEBUG = '0'
  }
  $previous = @{}
  try {
    foreach ($name in $variables.Keys) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process'); [Environment]::SetEnvironmentVariable($name, $variables[$name], 'Process') }
    $process = Start-Process -FilePath $ollamaExecutable -ArgumentList 'serve' -WorkingDirectory $runtimeDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDirectory 'ollama.stdout.log') -RedirectStandardError (Join-Path $runtimeDirectory 'ollama.stderr.log')
    Remember-Process 'ollama' $process $ollamaExecutable
  } finally { foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') } }
}
$version = $null
for ($attempt = 0; $attempt -lt 15; $attempt++) {
  try { $version = Read-LocalJson 'http://127.0.0.1:11434/api/version'; break } catch { Start-Sleep -Seconds 1 }
}
if ($version.version -ne '0.40.12') { throw 'The reviewed Ollama runtime did not become ready.' }

$nodeExecutable = (Get-Command node.exe).Source
if (!(Is-OwnedProcess $processState['gateway'] $nodeExecutable)) {
  if (Port-Occupied 11435) { throw 'Port 11435 belongs to another process; no process was stopped.' }
  $process = Start-Process -FilePath $nodeExecutable -ArgumentList @('"' + $gatewayScript + '"', '--config', '"' + $privateFile + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDirectory 'gateway.stdout.log') -RedirectStandardError (Join-Path $runtimeDirectory 'gateway.stderr.log')
  Remember-Process 'gateway' $process $nodeExecutable
}
if (Is-OwnedProcess $processState['gateway'] $nodeExecutable) {
  $processState['gateway'].executable = $nodeExecutable
  Save-State
}
$health = $null
for ($attempt = 0; $attempt -lt 10; $attempt++) {
  try { $health = Read-LocalJson 'http://127.0.0.1:11435/health' $headers; break } catch { Start-Sleep -Seconds 1 }
}
@{ localServicesStarted = $true; model = $model; modelInstalled = [bool]$health.ready;
   publicTunnelStarted = $false; siteConnectionChanged = $false } | ConvertTo-Json
} catch {
  Write-Output '{"error":"local_ai_start_failed","detailsWithheld":true,"publicTunnelStarted":false,"siteConnectionChanged":false}'
  exit 1
} finally {
  if ($lockHandle) { $lockHandle.Dispose(); Remove-Item -LiteralPath $lockFile -Force -ErrorAction SilentlyContinue }
}
