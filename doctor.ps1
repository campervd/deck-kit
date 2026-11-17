# Checks that this PC can build decks. Changes nothing. Run from the kit folder after setup.ps1:
#   powershell -ExecutionPolicy Bypass -File .\doctor.ps1
# The browser test starts each installed browser headless through the kit's own puppeteer, the same
# way the build's check step does. Run it in a normal terminal, not inside an agent's sandbox.
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot
$fail = 0
function Pass($t) { Write-Host "PASS  $t" -ForegroundColor Green }
function Fail($t) { Write-Host "FAIL  $t" -ForegroundColor Red; $script:fail++ }
function Note($t) { Write-Host "      $t" -ForegroundColor Yellow }
function Has($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }

if (Has node) { Pass "Node.js $(node -v)" } else { Fail 'Node.js not found (setup.ps1 says how to install it)' }
if (Test-Path node_modules\puppeteer) { Pass 'npm packages installed' } else { Fail 'npm packages missing: run setup.ps1' }
if (Has python) {
  $pylib = Join-Path $PSScriptRoot 'pylib'
  python -I -c "import sys; sys.path.insert(0, r'$pylib'); import pypdfium2, PIL" 2>$null
  if ($LASTEXITCODE -eq 0) { Pass 'Python (isolated, -I) with pypdfium2 and pillow from pylib' } else { Fail 'Python packages missing from pylib: run setup.ps1' }
} else { Fail "'python' not found on PATH" }
$soffice = 'C:\Program Files\LibreOffice\program\soffice.exe', 'C:\Program Files (x86)\LibreOffice\program\soffice.exe' |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if ($soffice -or (Has soffice)) { Pass 'LibreOffice' } else { Fail 'LibreOffice not found: run setup.ps1' }
# Codex: found the same way run-deck.ps1 starts it (tools\bridge-lib.ps1), then signed in.
. (Join-Path $PSScriptRoot 'tools\bridge-lib.ps1')
$codex = Get-CodexLauncher
if (-not $codex) {
  Fail 'Codex CLI not found in a form run-deck.ps1 can start: install it with npm install -g @openai/codex, or put a standalone codex.exe on PATH'
} else {
  $v = Invoke-Codex $codex @('--version')
  if ($v.Code -ne 0) { Fail "Codex was found ($($codex.Kind)) but did not run: $(($v.Out -split "`n")[0])" }
  else {
    Pass "Codex $(($v.Out -split "`n")[-1].Trim()), $($codex.Kind)"
    $l = Invoke-Codex $codex @('login', 'status')
    if ($l.Code -eq 0) { Pass "Codex signed in ($(($l.Out -split "`n")[-1].Trim()))" } else { Fail 'Codex is not signed in: run codex login' }
  }
}

# Browsers, in the order the exporter picks them (Chrome first, then Edge).
$browsers = [ordered]@{
  'Chrome' = 'C:\Program Files\Google\Chrome\Application\chrome.exe', 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
  'Edge'   = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', 'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
}
$probe = @'
const { createRequire } = require('module');
const puppeteer = createRequire(process.cwd() + '/package.json')('puppeteer');
(async () => {
  try {
    const b = await puppeteer.launch({ executablePath: process.argv[1], headless: true });
    const p = await b.newPage();
    await p.setContent('<p>ok</p>');
    const v = await b.version();
    await b.close();
    console.log('OK ' + v);
  } catch (e) { console.log('ERR ' + e.message.split('\n')[0]); }
  process.exit(0);
})();
'@
$usable = @()
$firstInstalled = $null
foreach ($name in $browsers.Keys) {
  $exe = $browsers[$name] | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $exe) { Write-Host "  --  $name not installed"; continue }
  if (-not $firstInstalled) { $firstInstalled = $name }
  $r = (node -e $probe $exe 2>$null | Select-Object -Last 1)
  if ($r -like 'OK *') { Pass "$name starts headless ($($r.Substring(3)))"; $usable += $name }
  else { Fail "$name is installed but did not start headless: $r" }
}
if (-not $usable) { Fail 'No browser could start headless here, so the build cannot run here directly. If a sandbox blocks it, use bridge.ps1.' }
elseif ($usable -notcontains $firstInstalled) {
  Fail "The exporter always uses $firstInstalled when it is installed, and $firstInstalled failed. Ask the PC's administrator why it can't run headless."
}

# Administrator policies that can stop a browser from being driven headless. Listed for information only.
foreach ($k in 'HKLM:\SOFTWARE\Policies\Google\Chrome', 'HKCU:\SOFTWARE\Policies\Google\Chrome',
               'HKLM:\SOFTWARE\Policies\Microsoft\Edge', 'HKCU:\SOFTWARE\Policies\Microsoft\Edge') {
  $p = Get-ItemProperty $k -ErrorAction SilentlyContinue
  if ($p) {
    $p.PSObject.Properties | Where-Object { $_.Name -match 'Headless|RemoteDebugging' } |
      ForEach-Object { Note "Policy ${k}: $($_.Name) = $($_.Value)" }
  }
}

if ($fail -eq 0) { Write-Host "`nAll checks passed. Next: new-deck.ps1 (see README.md)." -ForegroundColor Green; exit 0 }
Write-Host "`n$fail check(s) failed. Fix them, then rerun doctor.ps1." -ForegroundColor Yellow
exit 1
