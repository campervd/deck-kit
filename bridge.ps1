# The build bridge on its own. Agents build with `node tools/build-deck.mjs`, which runs the build directly;
# only an agent whose browser can't start (Codex's Windows sandbox) needs this. Then start it in a normal
# terminal and leave it open:
#   powershell -ExecutionPolicy Bypass -File .\bridge.ps1
# While it runs, build-deck.mjs in any decks\<name> folder falls back to it: this window runs the kit's
# fixed build for that deck and the agent gets the result. Close the window (or Ctrl+C) to stop.
# It builds only folders directly inside decks\, never follows links or junctions, and runs only the kit's
# own tools\build.mjs (see tools\bridge-lib.ps1). It changes nothing else.
param([string]$Deck = '')   # optional: serve only decks\<Deck>
$ErrorActionPreference = 'Continue'
$kit = $PSScriptRoot
. (Join-Path $kit 'tools\bridge-lib.ps1')

if (-not (Get-NodeExe)) { Write-Host 'node.exe not found. Run setup.ps1 first.' -ForegroundColor Red; exit 1 }
if (-not (Test-Path (Join-Path $kit 'node_modules\puppeteer'))) { Write-Host 'npm packages missing. Run setup.ps1 first.' -ForegroundColor Red; exit 1 }
$decksDir = Join-Path $kit 'decks'
if (Test-IsLink $decksDir) { Write-Host 'decks is a link or junction; refusing to serve it.' -ForegroundColor Red; exit 1 }

Write-Host "Build bridge for $decksDir$(if ($Deck) { "\$Deck" }). Leave this window open while your agent works; close it to stop." -ForegroundColor Cyan
$served = 0
while ($true) {
  $dirs = @(Get-ChildItem -LiteralPath $decksDir -Directory -ErrorAction SilentlyContinue |
    Where-Object { -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -and (-not $Deck -or $_.Name -eq $Deck) } |
    ForEach-Object { $_.FullName })
  foreach ($b in @(Invoke-BridgeRequests $dirs)) {
    $served++
    $name = Split-Path -Leaf $b.Deck
    $msg = if ($b.Refused) { "refused: $($b.Refused)" } elseif ($b.Ok) { 'passed' } else { "failed, $($b.Problems) problem(s)" }
    Write-Host ("[{0:HH:mm:ss}] build {1} for decks\{2}: {3}" -f (Get-Date), $served, $name, $msg) -ForegroundColor $(if ($b.Ok) { 'Green' } elseif ($b.Refused) { 'Red' } else { 'Yellow' })
  }
  Start-Sleep -Milliseconds 700
}
