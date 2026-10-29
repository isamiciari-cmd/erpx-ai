# Offline identity regressions; this file never invokes -Apply or Stop-Process.
$ErrorActionPreference = 'Stop'
$plan = . (Join-Path $PSScriptRoot 'stop-local-ai.ps1') | ConvertFrom-Json
if ($plan.applied -ne $false -or $plan.mode -ne 'offline_plan') { throw 'Default mode was not an offline plan.' }
$script:mockStarted = [datetime]::Parse('2026-10-28T12:00:00Z').ToUniversalTime()
$script:mockExe = 'C:\OfflineFixtures\node.exe'
$script:mockProcess = [pscustomobject]@{ Path = $script:mockExe; StartTime = $script:mockStarted; Handle = 1 }
$script:mockCommand = '"C:\OfflineFixtures\node.exe" "' + $gatewayScript + '" --config "' + $privateFile + '"'
function Get-Process { param($Id, $ErrorAction) return $script:mockProcess }
function Get-CimInstance { param($ClassName, $Filter, $ErrorAction) return [pscustomobject]@{ CommandLine = $script:mockCommand } }
function Must-Refuse($action) {
  $refused = $false
  try { & $action | Out-Null } catch { $refused = $true }
  if (!$refused) { throw 'Unexpected acceptance of an unowned process.' }
}
$record = [pscustomobject]@{ id = 424242; executable = $script:mockExe; startedAt = $script:mockStarted.ToString('o') }
$valid = Confirm-OwnedProcess $record 'gateway' $script:mockExe
if (!$valid.running) { throw 'The synthetic owned gateway was not accepted.' }
$record.startedAt = 'wrong'
Must-Refuse { Confirm-OwnedProcess $record 'gateway' $script:mockExe }
$record.startedAt = $script:mockStarted.ToString('o')
$record.executable = 'C:\Other\node.exe'
Must-Refuse { Confirm-OwnedProcess $record 'gateway' $script:mockExe }
$record.executable = $script:mockExe
$script:mockCommand = 'node.exe unrelated.mjs --config unrelated.json'
Must-Refuse { Confirm-OwnedProcess $record 'gateway' $script:mockExe }
$script:mockCommand = 'node.exe "' + $gatewayScript + '" --config wrong.private.json'
Must-Refuse { Confirm-OwnedProcess $record 'gateway' $script:mockExe }
$script:mockProcess = [pscustomobject]@{ Path = 'C:\Other\node.exe'; StartTime = $script:mockStarted; Handle = 1 }
Must-Refuse { Confirm-OwnedProcess $record 'gateway' $script:mockExe }
$script:mockProcess = $null
$gone = Confirm-OwnedProcess $record 'gateway' $script:mockExe
if ($gone.running) { throw 'An absent synthetic process was treated as running.' }
$script:mockProcess = [pscustomobject]@{ Path = $script:mockExe; StartTime = $script:mockStarted; Handle = 1 }
$record | Add-Member -NotePropertyName target -NotePropertyValue 'http://127.0.0.1:9999'
$script:mockCommand = 'cloudflared.exe tunnel --url http://127.0.0.1:11435'
Must-Refuse { Confirm-OwnedProcess $record 'tunnel' $script:mockExe }
@{ passed = $true; offlineChecks = 8; applied = $false; processesStopped = 0 } | ConvertTo-Json
