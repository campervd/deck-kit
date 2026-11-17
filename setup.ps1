# One-time setup for the deck kit on Windows. Run from the kit folder:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
# It installs: npm packages (dom-to-pptx, puppeteer) at the exact versions in package-lock.json,
# Python packages (pypdfium2 4.30.0, pillow 10.4.0) into this kit's pylib folder,
# LibreOffice (only if missing, through winget), and the deck fonts for your user account.
# It never touches files outside this folder except the per-user font folder.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$ok = $true
function Step($t) { Write-Host "`n== $t" -ForegroundColor Cyan }
function Has($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }

Step 'Node.js'
if (-not (Has node)) {
  Write-Host 'Node.js is missing. Install it, open a new terminal, rerun setup:' -ForegroundColor Yellow
  Write-Host '  winget install -e --id OpenJS.NodeJS.LTS'
  exit 1
}
node -v

Step 'npm packages (exact versions from package-lock.json; uses your Chrome or Edge, so no browser download)'
$env:PUPPETEER_SKIP_DOWNLOAD = 'true'
npm ci --no-fund
if ($LASTEXITCODE -ne 0) { Write-Host 'npm ci failed; see the error above.' -ForegroundColor Red; exit 1 }
npm audit --omit=dev
if ($LASTEXITCODE -ne 0) { Write-Host 'npm audit reported vulnerabilities (listed above). Ask whoever maintains the kit before going on.' -ForegroundColor Yellow; $ok = $false }

Step 'Browser'
$browsers = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe')
$browser = $browsers | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($browser) { Write-Host "Using $browser (headless, with a throwaway profile)" }
else { Write-Host 'No Chrome or Edge found. Install one, then rerun.' -ForegroundColor Red; $ok = $false }

Step 'Python packages (pinned, into this kit''s pylib folder; the build runs python -I and loads only these)'
if (-not (Has python)) {
  Write-Host "Python is missing (the build calls 'python'). Install it: winget install -e --id Python.Python.3.12" -ForegroundColor Yellow; $ok = $false
} else {
  $pylib = Join-Path $PSScriptRoot 'pylib'
  python -m pip install --quiet --disable-pip-version-check --upgrade --target $pylib pypdfium2==4.30.0 pillow==10.4.0
  if ($LASTEXITCODE -ne 0) { Write-Host 'pip install failed; see above.' -ForegroundColor Red; $ok = $false }
  else {
    python -I -c "import sys; sys.path.insert(0, r'$pylib'); import pypdfium2, PIL; print('pypdfium2', pypdfium2.V_PYPDFIUM2, '/ pillow', PIL.__version__, 'in pylib')"
    if ($LASTEXITCODE -ne 0) { Write-Host 'The packages in pylib do not import with python -I.' -ForegroundColor Red; $ok = $false }
  }
}

Step 'LibreOffice (renders the .pptx back to images)'
$soffice = @('C:\Program Files\LibreOffice\program\soffice.exe', 'C:\Program Files (x86)\LibreOffice\program\soffice.exe') |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $soffice -and (Has soffice)) { $soffice = (Get-Command soffice).Source }
if ($soffice) { Write-Host "Found $soffice" }
else {
  Write-Host 'Installing LibreOffice with winget (about 350 MB)...'
  winget install -e --id TheDocumentFoundation.LibreOffice --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { Write-Host 'LibreOffice install failed. Install it from libreoffice.org, then rerun.' -ForegroundColor Red; $ok = $false }
}

Step 'Font library (12 open-source families) for your user account'
$dest = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$reg = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts'
if (-not (Test-Path $reg)) { New-Item -Path $reg -Force | Out-Null }
Get-ChildItem -Path fonts -Filter *.ttf | ForEach-Object {
  $target = Join-Path $dest $_.Name
  # A font that is already installed and in use can't be overwritten. Skip it if it's the same file;
  # if it differs, leave it and say so rather than renaming or deleting anything.
  if ((Test-Path $target) -and ((Get-FileHash $target).Hash -eq (Get-FileHash $_.FullName).Hash)) {
    Write-Host "  $($_.Name) (already installed)"
  } else {
    try {
      Copy-Item $_.FullName $target -Force -ErrorAction Stop
      Write-Host "  $($_.Name)"
    } catch {
      Write-Host "  $($_.Name): a different version is installed and in use; close PowerPoint/LibreOffice and rerun to update it." -ForegroundColor Yellow
    }
  }
  New-ItemProperty -Path $reg -Name ("{0} (TrueType)" -f $_.BaseName) -Value $target -PropertyType String -Force | Out-Null
}
Write-Host 'Fonts installed. Close and reopen PowerPoint or LibreOffice if they were open.'

Step 'Codex'
if (Has codex) { codex --version } else { Write-Host 'codex not found on PATH: npm install -g @openai/codex' -ForegroundColor Yellow; $ok = $false }

if ($ok) { Write-Host "`nSetup complete. Next: powershell -ExecutionPolicy Bypass -File .\doctor.ps1" -ForegroundColor Green }
else { Write-Host "`nSetup finished with items to fix (yellow or red above). Fix them and rerun." -ForegroundColor Yellow; exit 1 }
