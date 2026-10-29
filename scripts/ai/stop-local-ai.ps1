# Default is an offline plan. -Apply stops only recorded, fully verified processes.
param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runtimeDirectory = Join-Path $projectRoot '.tmp/ai-runtime'
$stateFile = Join-Path $runtimeDirectory 'processes.json'
$lockFile = Join-Path $runtimeDirectory 'processes.connection.lock'
$gatewayScript = Join-Path $PSScriptRoot 'local-gateway.mjs'
$privateFile = Join-Path $runtimeDirectory 'gateway.private.json'
$tunnelTarget = 'http://127.0.0.1:11435'

function Assert-ExactArgument([string]$commandLine, [string]$argument) {
  $normalized = $commandLine.Replace('\', '/')
  $expected = [regex]::Escape($argument.Replace('\', '/'))
  return [regex]::IsMatch($normalized, '(?i)(?:^|\s)(?:"' + $expected + '"|' + $expected + ')(?=\s|$)')
}

function Confirm-OwnedProcess($record, [string]$name, [string]$expectedExecutable) {
  if (!$record -or !(@('ollama', 'gateway', 'tunnel') -contains $name)) { throw 'Unexpected process record; no process was stopped.' }
  $recordProcessId = 0
  if (![int]::TryParse([string]$record.id, [ref]$recordProcessId) -or $recordProcessId -le 0 -or $recordProcessId -eq $PID -or
      !$record.startedAt -or !$record.executable -or
      [IO.Path]::GetFullPath([string]$record.executable) -ne [IO.Path]::GetFullPath($expectedExecutable)) {
    throw 'Recorded process identity differs from the reviewed executable; no process was stopped.'
  }
  $process = Get-Process -Id $recordProcessId -ErrorAction SilentlyContinue
  if (!$process) { return @{ name = $name; running = $false; id = $recordProcessId } }
  if (!$process.Path -or [IO.Path]::GetFullPath($process.Path) -ne [IO.Path]::GetFullPath($expectedExecutable) -or
      $process.StartTime.ToUniversalTime().ToString('o') -ne [string]$record.startedAt) {
    throw 'A process ID was reused or its identity changed; no process was stopped.'
  }
  $observed = Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId = ' + $recordProcessId) -ErrorAction Stop
  if (!$observed -or !$observed.CommandLine) { throw 'Process command line could not be verified; no process was stopped.' }
  $commandLine = [string]$observed.CommandLine
  if ($name -eq 'gateway') {
    $normalized = $commandLine.Replace('\', '/')
    $expectedConfig = [regex]::Escape($privateFile.Replace('\', '/'))
    if (!(Assert-ExactArgument $commandLine $gatewayScript) -or
        ![regex]::IsMatch($normalized, '(?i)(?:^|\s)--config\s+(?:"' + $expectedConfig + '"|' + $expectedConfig + ')(?=\s|$)')) {
      throw 'The recorded Node process is not this project gateway; no process was stopped.'
    }
  } elseif ($name -eq 'ollama') {
    if (!(Assert-ExactArgument $commandLine 'serve')) { throw 'The recorded Ollama process is not its local server; no process was stopped.' }
  } else {
    if ($record.target -ne $tunnelTarget -or !(Assert-ExactArgument $commandLine 'tunnel') -or
        ![regex]::IsMatch($commandLine, '(?:^|\s)--url\s+(?:"http://127\.0\.0\.1:11435"|http://127\.0\.0\.1:11435)(?=\s|$)')) {
      throw 'The recorded tunnel is not the reviewed local gateway target; no process was stopped.'
    }
  }
  # Pin an OS handle before stopping, avoiding a later bare-PID kill.
  $null = $process.Handle
  return @{ name = $name; running = $true; id = $recordProcessId; process = $process }
}

function Save-ProcessState($state) {
  $temporary = Join-Path $runtimeDirectory ('.processes-stop-' + [guid]::NewGuid().ToString('N') + '.tmp')
  try {
    $bytes = (New-Object Text.UTF8Encoding($false)).GetBytes(($state | ConvertTo-Json -Depth 32))
    $handle = [IO.File]::Open($temporary, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $handle.Write($bytes, 0, $bytes.Length); $handle.Flush($true) } finally { $handle.Dispose() }
    [IO.File]::Replace($temporary, $stateFile, $null)
  } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force } }
}

if (!$Apply) {
  @{ mode = 'offline_plan'; stopOrder = @('tunnel', 'gateway', 'ollama'); recordedOwnedProcessesOnly = $true;
     validateAllBeforeAnyStop = $true; state = '.tmp/ai-runtime/processes.json'; sharedConnectionLock = $true;
     remoteConfigurationChanged = $false; unrelatedProcessesStopped = $false; applied = $false } | ConvertTo-Json -Depth 5
  return
}

if (!$runtimeDirectory.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Runtime path is outside this project.' }
if (!(Test-Path -LiteralPath $runtimeDirectory -PathType Container)) { throw 'Reviewed runtime directory is missing; no process was stopped.' }
foreach ($entry in @((Join-Path $projectRoot '.tmp'), $runtimeDirectory)) {
  if (((Get-Item -LiteralPath $entry -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Runtime path is redirected; no process was stopped.' }
}
if (!(Test-Path -LiteralPath $stateFile -PathType Leaf) -or
    ((Get-Item -LiteralPath $stateFile -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'A regular recorded process state file is required; no process was stopped.' }
if ((Get-Item -LiteralPath $stateFile).Length -gt 65536) { throw 'Process state exceeds its reviewed limit; no process was stopped.' }
$lockHandle = $null
$validated = @()
try {
  try { $lockHandle = [IO.File]::Open($lockFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None) }
  catch { throw 'Another connection/stop operation holds the lock; no process was stopped.' }
  $saved = Get-Content -LiteralPath $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json
  if (!$saved -or $saved -isnot [pscustomobject]) { throw 'Recorded process state is invalid; no process was stopped.' }
  $state = @{}
  foreach ($property in $saved.PSObject.Properties) { $state[$property.Name] = $property.Value }
  $executables = @{ ollama = (Join-Path $runtimeDirectory 'ollama/ollama.exe'); tunnel = (Join-Path $runtimeDirectory 'cloudflared.exe') }
  if ($state.ContainsKey('gateway')) { $executables['gateway'] = (Get-Command node.exe -ErrorAction Stop).Source }
  # Entire inventory must be verified before the first termination.
  foreach ($name in @('tunnel', 'gateway', 'ollama')) {
    if ($state.ContainsKey($name)) { $validated += Confirm-OwnedProcess $state[$name] $name $executables[$name] }
  }
  $stopped = @()
  $alreadyAbsent = @()
  foreach ($entry in $validated) {
    if ($entry.running) {
      $current = Confirm-OwnedProcess $state[$entry.name] $entry.name $executables[$entry.name]
      if ($current.running) {
        try {
          Stop-Process -InputObject $current.process -ErrorAction Stop
          if (!$current.process.WaitForExit(5000)) { throw 'Recorded process termination could not be confirmed.' }
        } finally { $current.process.Dispose() }
        $stopped += $entry.name
      } else { $alreadyAbsent += $entry.name }
    } else { $alreadyAbsent += $entry.name }
    $state.Remove($entry.name)
    Save-ProcessState $state
  }
  @{ mode = 'applied'; stopped = $stopped; alreadyAbsent = $alreadyAbsent;
     remoteConfigurationChanged = $false; unrelatedProcessesStopped = $false; applied = $true } | ConvertTo-Json -Depth 5
} finally {
  foreach ($entry in $validated) { if ($entry.running) { $entry.process.Dispose() } }
  if ($lockHandle) { $lockHandle.Dispose(); Remove-Item -LiteralPath $lockFile -Force }
}
