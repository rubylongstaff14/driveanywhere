# Package Unreal map content for S3 / manual share (~100–350 MB)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

$src = Join-Path $root "nextgen\unreal\DriveAnywhere\Content\DriveAnywhere"
$out = Join-Path $root "nextgen\unreal\driveanywhere-maps.zip"

if (-not (Test-Path $src)) {
  Write-Error "Missing $src — run from repo root after Unreal rebuild."
}

$staging = Join-Path $env:TEMP "da-maps-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

Copy-Item -Recurse (Join-Path $src "Maps") (Join-Path $staging "Maps")
Copy-Item -Recurse (Join-Path $src "Materials") (Join-Path $staging "Materials")
if (Test-Path (Join-Path $src "BP_DARacer.uasset")) {
  New-Item -ItemType Directory -Path (Join-Path $staging "Root") | Out-Null
  Copy-Item (Join-Path $src "..\DriveAnywhere\BP_*.uasset") (Join-Path $staging "Root") -ErrorAction SilentlyContinue
}

if (Test-Path $out) { Remove-Item $out -Force }
Compress-Archive -Path "$staging\*" -DestinationPath $out -CompressionLevel Optimal

$mb = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host "Created $out ($mb MB)"
Write-Host "Upload: aws s3 cp `"$out`" s3://YOUR-BUCKET/driveanywhere-maps.zip"
