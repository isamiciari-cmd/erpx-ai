# Offline ownership tests only. Never invokes -Apply or starts/stops processes.
$ErrorActionPreference = 'Stop'
$plan = . (Join-Path $PSScriptRoot 'connect-site.ps1') | ConvertFrom-Json
if ($plan.mode -ne 'offline_plan' -or $plan.publicTunnelStarted -ne $false -or $plan.siteSecretsChanged -ne $false) { throw 'Unsafe default mode.' }
$script:fakePath = 'C:\OfflineFixtures\node.exe'
$script:fakeTime = [DateTime]::Parse('2026-10-28T11:00:00Z').ToUniversalTime()
$script:fakeProcess = [pscustomobject]@{ Path = $script:fakePath; StartTime = $script:fakeTime; Handle = 1 }
$script:fakeCommand = '"' + $script:fakePath + '" "' + $gatewayScript + '" --config "' + $privateFile + '"'
function Get-Process { param($Id, $ErrorAction) return $script:fakeProcess }
function Get-CimInstance { param($ClassName, $Filter, $ErrorAction) return [pscustomobject]@{ CommandLine = $script:fakeCommand } }
function Refuses($action) {
  $failed = $false
  try { & $action | Out-Null } catch { $failed = $true }
  if (!$failed) { throw 'An unowned process was accepted.' }
}
$record = [pscustomobject]@{ id = 123456; executable = $script:fakePath; startedAt = $script:fakeTime.ToString('o') }
$valid = Owned-Process $record $script:fakePath 'gateway'
if (!$valid) { throw 'Owned gateway fixture was rejected.' }
$record.startedAt = 'different'
Refuses { Owned-Process $record $script:fakePath 'gateway' }
$record.startedAt = $script:fakeTime.ToString('o')
$record.executable = $null
Refuses { Owned-Process $record $script:fakePath 'gateway' }
$record.executable = $script:fakePath
$script:fakeCommand = 'node.exe "' + $gatewayScript + '.other" --config "' + $privateFile + '"'
Refuses { Owned-Process $record $script:fakePath 'gateway' }
$script:fakeCommand = 'node.exe "' + $gatewayScript + '" --config "' + $privateFile + '.other"'
Refuses { Owned-Process $record $script:fakePath 'gateway' }
$script:fakeCommand = 'cloudflared.exe tunnel --url http://127.0.0.1:11434 --protocol http2 --no-autoupdate'
Refuses { Owned-Process $record $script:fakePath 'tunnel' }
$script:fakeCommand = 'cloudflared.exe tunnel --url http://127.0.0.1:11435 --protocol http2 --no-autoupdate'
if (!(Owned-Process $record $script:fakePath 'tunnel')) { throw 'Reviewed tunnel fixture was rejected.' }
$script:fakeCommand = 'cloudflared.exe tunnel --url http://127.0.0.1:11435 --protocol quic --no-autoupdate'
Refuses { Owned-Process $record $script:fakePath 'tunnel' }
Assert-NoTunnelOverrides @('PATH', 'SYNTHETIC_PUBLIC_SETTING') @()
Refuses { Assert-NoTunnelOverrides @('TUNNEL_TOKEN') @() }
Refuses { Assert-NoTunnelOverrides @('PATH') @('synthetic-config.yml') }
@{ passed = $true; offlineChecks = 11; publicTunnelsStarted = 0; processesStopped = 0; applied = $false } | ConvertTo-Json
