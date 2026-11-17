# The build's safety tests. Run from the kit folder in a normal terminal, after setup.ps1 and doctor.ps1:
#   powershell -ExecutionPolicy Bypass -File .\tests\hardening.ps1
# Each test copies the kit's own small test deck (tests\fixture\) to decks\zz-hardening-<n>\, builds it, and
# removes it at the end. Nothing else in the kit is touched, and no example deck is needed.
# Prints one PASS or FAIL line per test. Exit code: the number of failed tests (0 = all passed).
$ErrorActionPreference = 'Continue'
$kit = Split-Path -Parent $PSScriptRoot
. (Join-Path $kit 'tools\bridge-lib.ps1')
$fixture = Join-Path $PSScriptRoot 'fixture'
$work = Join-Path $env:TEMP "deck-kit-hardening-$PID"
$script:failed = 0
function Report($name, $ok, $detail) {
  if (-not $ok) { $script:failed++ }
  Write-Host ("{0}  {1}: {2}" -f $(if ($ok) { 'PASS' } else { 'FAIL' }), $name, $detail) -ForegroundColor $(if ($ok) { 'Green' } else { 'Red' })
}
function Cleanup {
  # The junction first, with rmdir, so that removing it never touches the folder it points to.
  $j = Join-Path $kit 'decks\zz-hardening-6-junction'
  if (Test-Path $j) { cmd /c rmdir "$j" | Out-Null }
  Get-ChildItem (Join-Path $kit 'decks') -Directory -Filter 'zz-hardening-*' -ErrorAction SilentlyContinue | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
  if (Test-Path $work) { Remove-Item -LiteralPath $work -Recurse -Force }
}
# A fresh copy of the test deck, set up the way new-deck.ps1 sets up a deck: fonts and the agent's build command.
function NewDeck($n) {
  $d = Join-Path $kit "decks\$n"
  Copy-Item $fixture $d -Recurse
  Copy-Item (Join-Path $kit 'fonts') $d -Recurse
  New-Item -ItemType Directory (Join-Path $d 'tools') -Force | Out-Null
  Copy-Item (Join-Path $kit 'tools\build-deck.mjs'), (Join-Path $kit 'tools\request-build.mjs') (Join-Path $d 'tools')
  $d
}
function Direct($d) { Push-Location -LiteralPath $d; $o = node tools/build-deck.mjs 2>&1 | ForEach-Object { "$_" }; $c = $LASTEXITCODE; Pop-Location; @{ Code = $c; Out = $o } }
function Steps($d) { (Get-Content (Join-Path $d 'out\build-log.txt') | Where-Object { $_ -match '^> ' } | ForEach-Object { $_.Substring(2) }) -join ', ' }

if (-not (Test-Path (Join-Path $fixture 'deck.html'))) { Write-Host "The test deck is missing: $fixture" -ForegroundColor Red; exit 1 }
Cleanup
New-Item -ItemType Directory $work | Out-Null

# 1. The test deck builds through the bridge code (the path run-deck.ps1 and bridge.ps1 use).
$d = NewDeck 'zz-hardening-1-bridge'
$b = Invoke-DeckBuild $d
Report 'normal deck, bridge build' ($b.Code -eq 0) "exit $($b.Code); steps: $(Steps $d)"

# 2. The same deck builds directly with the agent's command, with no bridge running.
$d2 = NewDeck 'zz-hardening-2-direct'
$time = Measure-Command { $r = Direct $d2 }
Report 'normal deck, direct build, no bridge' ($r.Code -eq 0 -and ($r.Out -match 'Build PASSED') -and -not ($r.Out -match 'bridge')) "exit $($r.Code) in $([int]$time.TotalSeconds)s; bridge mentioned: $([bool]($r.Out -match 'bridge'))"

# 3. A .puppeteerrc.cjs planted in the deck runs when Puppeteer starts from the deck folder (the control),
#    but never during either build, because the build starts the browser from the kit folder.
$d = NewDeck 'zz-hardening-3-planted'
$mark = Join-Path $work 'puppeteerrc-ran.txt'
"require('fs').appendFileSync('$($mark.Replace('\','\\'))', (process.env.MARK_LABEL || 'build') + '\n'); module.exports = {};" | Set-Content (Join-Path $d '.puppeteerrc.cjs') -Encoding ascii
$browser = if ($env:BROWSER_PATH) { $env:BROWSER_PATH } else {
  'C:\Program Files\Google\Chrome\Application\chrome.exe', 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', 'C:\Program Files\Microsoft\Edge\Application\msedge.exe' | Where-Object { Test-Path $_ } | Select-Object -First 1 }
$probe = Join-Path $work 'control.cjs'
@"
const { createRequire } = require('module');
const puppeteer = createRequire('$((Join-Path $kit 'package.json').Replace('\','\\'))')('puppeteer');
puppeteer.launch({ headless: true, executablePath: process.argv[2] }).then((b) => b.close());
"@ | Set-Content $probe -Encoding ascii
Push-Location -LiteralPath $d; $env:MARK_LABEL = 'control'; node $probe $browser 2>&1 | Out-Null; Remove-Item Env:MARK_LABEL; Pop-Location
$control = (Test-Path $mark) -and ((Get-Content $mark) -contains 'control')
$r = Direct $d
$b = Invoke-DeckBuild $d
$buildRuns = if (Test-Path $mark) { @(Get-Content $mark | Where-Object { $_ -eq 'build' }).Count } else { 0 }
Report 'planted .puppeteerrc.cjs ignored' ($control -and $buildRuns -eq 0 -and $r.Code -eq 0 -and $b.Code -eq 0) "control ran it: $control; direct build exit $($r.Code), bridge build exit $($b.Code); times it ran during the builds: $buildRuns"

# 4. A request for a file outside the deck (C:\Windows\win.ini) is blocked in the check step and in the export step.
$d = NewDeck 'zz-hardening-4-winini'
$h = Join-Path $d 'deck.html'
$c = [IO.File]::ReadAllText($h)
$i = $c.IndexOf('<section class="slide')
$c = $c.Substring(0, $i) + "<section style='background-image:url(file:///C:/Windows/win.ini)'" + $c.Substring($i + 8)
[IO.File]::WriteAllText($h, $c)
$r = Direct $d
$blockedCheck = [bool]($r.Out -match 'Request blocked.*win\.ini')
Push-Location -LiteralPath $kit; $e = node (Join-Path $kit 'tools\export.mjs') $d 2>&1 | ForEach-Object { "$_" }; $ec = $LASTEXITCODE; Pop-Location
$blockedExport = [bool]($e -match 'request blocked.*win\.ini')
Report 'request outside the deck blocked' ($r.Code -ne 0 -and $blockedCheck -and $ec -ne 0 -and $blockedExport -and -not (Test-Path (Join-Path $d 'out\deck.pptx'))) "full build exit $($r.Code), check blocked it: $blockedCheck; export alone exit $ec, blocked it: $blockedExport; deck.pptx written: $(Test-Path (Join-Path $d 'out\deck.pptx'))"

# 5. The .pptx font check passes the good file and fails a missing face and a missing bold style.
$good = Join-Path $d2 'out\deck.pptx'
python -I (Join-Path $PSScriptRoot 'make_bad_pptx.py') $good (Join-Path $work 'bad') | Out-Null
$codes = foreach ($f in $good, (Join-Path $work 'bad\no-face.pptx'), (Join-Path $work 'bad\no-bold.pptx')) { python -I (Join-Path $kit 'tools\check_pptx.py') $f | Out-Null; $LASTEXITCODE }
Report 'pptx font check' ($codes[0] -eq 0 -and $codes[1] -eq 1 -and $codes[2] -eq 1) "good: $($codes[0]), face not embedded: $($codes[1]), bold not embedded: $($codes[2]) (want 0, 1, 1)"

# 6. A deck folder that is a junction is refused by the direct build and by the bridge code.
$j = Join-Path $kit 'decks\zz-hardening-6-junction'
cmd /c mklink /J "$j" (Join-Path $kit 'decks\zz-hardening-1-bridge') | Out-Null
$r = Direct $j
$b = Invoke-DeckBuild $j
Report 'junction deck folder refused' ($r.Code -eq 4 -and $b.Code -eq 4) "direct exit $($r.Code), bridge exit $($b.Code) (want 4 and 4)"

Cleanup
Write-Host "`n$(6 - $script:failed) of 6 tests passed." -ForegroundColor $(if ($script:failed) { 'Yellow' } else { 'Green' })
exit $script:failed
