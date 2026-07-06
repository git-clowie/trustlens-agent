param(
  [string]$ReleaseDir = "release"
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ReleaseRoot = Join-Path $Root $ReleaseDir
New-Item -ItemType Directory -Force -Path $ReleaseRoot | Out-Null
$ReleaseRoot = (Resolve-Path $ReleaseRoot).Path

$WorkDir = [System.IO.Path]::GetFullPath((Join-Path $ReleaseRoot "_package_work"))
if (-not $WorkDir.StartsWith($ReleaseRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to use package work dir outside release folder: $WorkDir"
}

if (Test-Path -LiteralPath $WorkDir) {
  Remove-Item -LiteralPath $WorkDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null

$WebZip = Join-Path $ReleaseRoot "trustlens-web-dist.zip"
$FullZip = Join-Path $ReleaseRoot "trustlens-full-app.zip"
$ReleaseReadme = Join-Path $ReleaseRoot "README_RELEASE.txt"

foreach ($zip in @($WebZip, $FullZip)) {
  if (Test-Path -LiteralPath $zip) {
    Remove-Item -LiteralPath $zip -Force
  }
}

$DistPath = Join-Path $Root "web\dist"
if (-not (Test-Path -LiteralPath (Join-Path $DistPath "index.html"))) {
  throw "web/dist is missing. Run npm run build in web first."
}

Compress-Archive -Path (Join-Path $DistPath "*") -DestinationPath $WebZip -Force

$FullRoot = Join-Path $WorkDir "trustlens-agent"
New-Item -ItemType Directory -Force -Path $FullRoot | Out-Null

$TopLevelFiles = @(
  ".dockerignore",
  ".env.example",
  ".gitignore",
  "CHANGELOG.md",
  "Dockerfile",
  "README.md",
  "pyproject.toml",
  "requirements.txt",
  "writeup.md"
)

foreach ($file in $TopLevelFiles) {
  $source = Join-Path $Root $file
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination $FullRoot -Force
  }
}

$SourceDirs = @(
  "backend",
  "docs",
  "extension",
  "fixtures",
  "scripts",
  "src",
  "tests"
)

foreach ($dir in $SourceDirs) {
  $source = Join-Path $Root $dir
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $FullRoot $dir) -Recurse -Force
  }
}

$WebRoot = Join-Path $FullRoot "web"
New-Item -ItemType Directory -Force -Path $WebRoot | Out-Null

$WebFiles = @(
  "index.html",
  "package.json",
  "package-lock.json",
  "README.md",
  "tsconfig.app.json",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts"
)

foreach ($file in $WebFiles) {
  $source = Join-Path (Join-Path $Root "web") $file
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination $WebRoot -Force
  }
}

foreach ($dir in @("dist", "public", "src")) {
  $source = Join-Path (Join-Path $Root "web") $dir
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $WebRoot $dir) -Recurse -Force
  }
}

Get-ChildItem -LiteralPath $FullRoot -Recurse -Directory -Force |
  Where-Object { $_.Name -in @("__pycache__", ".pytest_cache") } |
  Remove-Item -Recurse -Force

Get-ChildItem -LiteralPath $FullRoot -Recurse -File -Force |
  Where-Object { $_.Extension -in @(".pyc", ".pyo") } |
  Remove-Item -Force

@"
TrustLens release packages
Version: 1.0.2
Public demo target: https://pixek.xyz/trustlens/

trustlens-web-dist.zip
- Upload the archive contents to static hosting when the API is served separately or same-origin.
- Relative asset paths support domain-root or subfolder deploys, for example /trustlens/.
- Static quick samples include a marked Browser Demo Fallback when the API is unreachable.
- Keep OPENROUTER_API_KEY and GEMINI_API_KEY only on the backend.
- web/dist/config.js defaults to same-origin API with Provider Settings hidden.
- Use ?settings=1 for admin testing.

trustlens-full-app.zip
- Full source handoff with backend, CLI, MCP server, extension, docs, tests, and built web/dist.
- Create .env from .env.example on the server.
- Recommended model: OPENROUTER_MODEL=google/gemma-4-31b-it.
- Start backend: python backend/run.py

Checks run before packaging should include:
- python -m unittest discover -s tests
- python -m compileall src backend scripts
- cd web; npm run lint; npm run build
"@ | Set-Content -LiteralPath $ReleaseReadme -Encoding UTF8

Compress-Archive -Path (Join-Path $FullRoot "*") -DestinationPath $FullZip -Force

Remove-Item -LiteralPath $WorkDir -Recurse -Force

Write-Host "Created:"
Write-Host " - $WebZip"
Write-Host " - $FullZip"
Write-Host " - $ReleaseReadme"
