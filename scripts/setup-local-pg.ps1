$ErrorActionPreference = "Stop"

# Define paths
$tempDir = "e:\Projects\work\backend\temp-postgres"
$zipFile = "$tempDir\postgresql.zip"
$pgsqlDir = "$tempDir\pgsql"
$dataDir = "$tempDir\data"

if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

# Download if not already downloaded
if (-not (Test-Path $zipFile)) {
    Write-Host "Downloading PostgreSQL binaries (using curl.exe)..."
    & curl.exe -L -o $zipFile "https://get.enterprisedb.com/postgresql/postgresql-16.2-1-windows-x64-binaries.zip"
}

# Extract if not already extracted
if (-not (Test-Path $pgsqlDir)) {
    Write-Host "Extracting PostgreSQL..."
    # tar is built-in on Windows 10/11 and is extremely fast
    tar -xf $zipFile -C $tempDir
}

# Init DB if not already initialized
if (-not (Test-Path $dataDir)) {
    Write-Host "Initializing Database..."
    & "$pgsqlDir\bin\initdb.exe" -D $dataDir -U postgres --auth-local=trust --auth-host=trust
}

# Start PostgreSQL on port 54322
Write-Host "Starting PostgreSQL on port 54322..."
& "$pgsqlDir\bin\pg_ctl.exe" -D $dataDir -l "$tempDir\pg.log" -o "-F -p 54322" start

Write-Host "PostgreSQL started successfully!"
