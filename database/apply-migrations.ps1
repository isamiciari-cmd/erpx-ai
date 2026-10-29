[CmdletBinding()]
param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$migrationDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../supabase/migrations'))
$migrationFiles = Get-ChildItem -LiteralPath $migrationDirectory -Filter '*.sql' | Sort-Object Name
if (-not $migrationFiles) { throw 'No canonical Supabase migrations found.' }
foreach ($migrationFile in $migrationFiles) { Write-Output $migrationFile.Name }
if (-not $Apply) {
  Write-Output 'Plan only. To apply to a prepared Supabase database, set DATABASE_URL securely and run this script with -Apply.'
  exit 0
}
if (-not $env:DATABASE_URL) { throw 'DATABASE_URL must be provided in the process environment; frontend VITE keys cannot install a database.' }
$psqlCommand = Get-Command psql -ErrorAction Stop
$connectionUri = [Uri]$env:DATABASE_URL
if ($connectionUri.Scheme -notin @('postgres','postgresql')) { throw 'DATABASE_URL must be a PostgreSQL connection URI.' }
$identityParts = $connectionUri.UserInfo.Split(':',2)
if ($identityParts.Length -ne 2) { throw 'DATABASE_URL must contain an administrative database username and password.' }
$pgSettings = @{
  PGHOST=$connectionUri.Host
  PGPORT=$(if ($connectionUri.Port -gt 0) { [string]$connectionUri.Port } else { '5432' })
  PGDATABASE=[Uri]::UnescapeDataString($connectionUri.AbsolutePath.TrimStart('/'))
  PGUSER=[Uri]::UnescapeDataString($identityParts[0])
  PGPASSWORD=[Uri]::UnescapeDataString($identityParts[1])
  PGSSLMODE=$(if ($connectionUri.IsLoopback) { 'disable' } else { 'require' })
}
foreach ($pair in $connectionUri.Query.TrimStart('?').Split('&')) {
  $parts = $pair.Split('=',2)
  if ($parts.Length -eq 2 -and $parts[0] -eq 'sslmode') {
    if ($parts[1] -notin @('require','verify-ca','verify-full','disable','prefer')) { throw 'Unsupported sslmode.' }
    $pgSettings.PGSSLMODE=$parts[1]
  }
}
$oldSettings = @{}
$temporarySql = $null
try {
  foreach ($name in $pgSettings.Keys) {
    $oldSettings[$name]=[Environment]::GetEnvironmentVariable($name,'Process')
    [Environment]::SetEnvironmentVariable($name,$pgSettings[$name],'Process')
  }
  # Pass authentication through the child environment, never the command line.
  $existing = & $psqlCommand.Source --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=on --command "SELECT CASE WHEN to_regclass('public.companies') IS NOT NULL AND to_regclass('public.erpx_migration_history') IS NULL THEN 'legacy' ELSE 'ready' END"
  if ($LASTEXITCODE -ne 0) { throw 'Database connection preflight failed.' }
  if (($existing -join '').Trim() -eq 'legacy') { throw 'An existing unversioned schema was detected. Reconcile its schema and migration history before applying the canonical baseline; no existing tables were changed.' }
  & $psqlCommand.Source --no-psqlrc --quiet --set=ON_ERROR_STOP=on --command "CREATE TABLE IF NOT EXISTS public.erpx_migration_history(version text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now()); REVOKE ALL ON public.erpx_migration_history FROM PUBLIC,anon,authenticated;"
  if ($LASTEXITCODE -ne 0) { throw 'Could not initialize migration history.' }
  foreach ($migrationFile in $migrationFiles) {
    if ($migrationFile.Name -notmatch '^\d{14}_[a-z_]+\.sql$') { throw "Invalid migration filename: $($migrationFile.Name)" }
    $version = $migrationFile.BaseName
    $checksum = (Get-FileHash -LiteralPath $migrationFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $recorded = & $psqlCommand.Source --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=on --command "SELECT sha256 FROM public.erpx_migration_history WHERE version='$version'"
    if ($LASTEXITCODE -ne 0) { throw 'Could not read migration history.' }
    $recordedHash = ($recorded -join '').Trim()
    if ($recordedHash) {
      if ($recordedHash -ne $checksum) { throw "Applied migration checksum changed: $version. Create a new upgrade migration instead." }
      Write-Output "Already applied: $version"
      continue
    }
    $sql = [IO.File]::ReadAllText($migrationFile.FullName)
    $sql = [regex]::Replace($sql,'(?m)^\s*(BEGIN|COMMIT);\s*$','')
    $sql = "BEGIN;`n$sql`nINSERT INTO public.erpx_migration_history(version,sha256) VALUES('$version','$checksum');`nCOMMIT;"
    $temporarySql = Join-Path ([IO.Path]::GetTempPath()) ('erpx-migration-'+[Guid]::NewGuid().ToString()+'.sql')
    [IO.File]::WriteAllText($temporarySql,$sql,[Text.UTF8Encoding]::new($false))
    & $psqlCommand.Source --no-psqlrc --quiet --set=ON_ERROR_STOP=on --file $temporarySql
    if ($LASTEXITCODE -ne 0) { throw "Migration failed and rolled back: $version" }
    Remove-Item -LiteralPath $temporarySql
    $temporarySql=$null
    Write-Output "Applied: $version"
  }
} finally {
  foreach ($name in $oldSettings.Keys) { [Environment]::SetEnvironmentVariable($name,$oldSettings[$name],'Process') }
  if ($temporarySql -and (Test-Path -LiteralPath $temporarySql)) { Remove-Item -LiteralPath $temporarySql }
}
