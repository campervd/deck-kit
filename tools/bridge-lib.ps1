# Shared build-bridge code for run-deck.ps1 and bridge.ps1. Dot-source it: . "$kit\tools\bridge-lib.ps1"
#
# A deck folder is written by an agent, so the build treats it as untrusted input:
#  - it runs only the kit's own tools\build.mjs, by absolute path, from the kit folder, with the deck
#    folder as an argument (never npm, never anything from the deck folder: npm reads a deck .npmrc,
#    and Puppeteer loads a .puppeteerrc.cjs from its working folder);
#  - it refuses a deck whose folder, deck.html or output folders are links or junctions (checked here
#    before anything is written, and again in tools\guard.mjs);
#  - a build request is only a file that says "build"; it carries no commands.

$script:KitRoot = Split-Path -Parent $PSScriptRoot
# cmd.exe and CreateProcess search the current folder before PATH; turn that off for everything started from here.
$env:NoDefaultCurrentDirectoryInExePath = '1'

function Get-NodeExe {
  $n = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($n) { $n.Source } else { $null }
}

# How to start Codex, by absolute path and without cmd.exe (so no program is looked up in any working folder).
# doctor.ps1 and run-deck.ps1 both use this, so doctor passes exactly when run-deck can start Codex.
#  1. An npm install (npm install -g @openai/codex): codex.cmd on PATH, with node_modules\@openai\codex\bin\codex.js
#     beside it. Started as node.exe <codex.js>.
#  2. A standalone install: codex.exe on PATH. Started directly.
# Returns @{ Exe; Pre (arguments before Codex's own); Kind } or $null if neither is found.
function Get-CodexLauncher {
  $node = Get-NodeExe
  $cmd = Get-Command codex.cmd -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cmd -and $node) {
    $js = Join-Path (Split-Path $cmd.Source) 'node_modules\@openai\codex\bin\codex.js'
    if (Test-Path $js) { return [pscustomobject]@{ Exe = $node; Pre = @($js); Kind = "npm install ($js)" } }
  }
  $exe = Get-Command codex.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($exe) { return [pscustomobject]@{ Exe = $exe.Source; Pre = @(); Kind = "standalone ($($exe.Source))" } }
  $null
}

# Runs Codex once with the given arguments and returns @{ Code; Out } (stdout and stderr together).
function Invoke-Codex($launcher, [string[]]$codexArgs) {
  $out = & $launcher.Exe @($launcher.Pre + $codexArgs) 2>&1 | ForEach-Object { "$_" }
  [pscustomobject]@{ Code = $LASTEXITCODE; Out = ($out -join "`n") }
}

function Test-IsLink($path) {
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  [bool]((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)
}

# Returns the reasons a deck folder must not be built or written to, or nothing.
function Get-DeckLinkProblems($deckDir) {
  $problems = @()
  foreach ($rel in '', 'deck.html', 'out', 'out\bridge', 'out\build-log.txt', 'out\html', 'out\diagrams', 'out\compare', 'out\pptx', 'out\deck.pptx', 'diagrams', 'fonts', 'assets') {
    $p = if ($rel) { Join-Path $deckDir $rel } else { $deckDir }
    if (Test-IsLink $p) { $problems += "$(if ($rel) { $rel } else { 'the deck folder' }) is a link or junction" }
  }
  $decks = Join-Path $script:KitRoot 'decks'
  if (Test-IsLink $decks) { $problems += 'the kit''s decks folder is a link or junction' }
  $problems
}

function Get-DeckSourceHash($deckDir) {
  $files = @('deck.html', 'design.md') | ForEach-Object { Join-Path $deckDir $_ } | Where-Object { Test-Path -LiteralPath $_ }
  $files += @(Get-ChildItem -LiteralPath (Join-Path $deckDir 'diagrams') -Filter *.html -File -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
  ($files | ForEach-Object { (Get-FileHash -LiteralPath $_).Hash }) -join ''
}

# Builds one deck with the kit's own build.mjs. Writes <deck>\out\build-log.txt. Returns the exit code
# (0 passed; 4 refused before anything ran; 5 the browser could not start; other: the failing step's code).
function Invoke-DeckBuild($deckDir) {
  $deckDir = (Resolve-Path -LiteralPath $deckDir).Path
  $links = Get-DeckLinkProblems $deckDir
  if ($links) { return @{ Code = 4; Refused = ($links -join '; ') } }
  $out = Join-Path $deckDir 'out'
  New-Item -ItemType Directory -Force -Path $out | Out-Null
  $log = Join-Path $out 'build-log.txt'
  $node = Get-NodeExe
  if (-not $node) { return @{ Code = 2; Refused = 'node.exe not found on PATH' } }
  Push-Location -LiteralPath $script:KitRoot
  try {
    # build.mjs writes the log itself, in UTF-8: Windows PowerShell's *> would write UTF-16, which the
    # agent's build command can't read.
    & $node (Join-Path $script:KitRoot 'tools\build.mjs') $deckDir --log *> $null
    $code = $LASTEXITCODE
  } finally { Pop-Location }
  $refused = if ($code -eq 4) { ((Get-Content -LiteralPath $log | Where-Object { $_ -match '^PROBLEM  build refused' }) -replace '^PROBLEM  build refused: ', '') -join '; ' } else { $null }
  @{ Code = $code; Refused = $refused }
}

function Write-BridgeJson($path, $obj) { [IO.File]::WriteAllText($path, ($obj | ConvertTo-Json -Compress)) }

# Serves pending build requests in the given deck folders. Each served request returns an object with
# Deck, Code, Ok, Hash (the deck source it built) and Problems. The requester (tools\request-build.mjs, which build-deck.mjs falls back to)
# writes out\bridge\request-<id>.json; this writes out\bridge\result-<id>.json next to it.
$script:LinkWarned = @{}
function Invoke-BridgeRequests($deckDirs) {
  foreach ($deckDir in $deckDirs) {
    $bridge = Join-Path $deckDir 'out\bridge'
    if (-not (Test-Path -LiteralPath $bridge)) { continue }
    # A deck with links or junctions is never touched: no reading, deleting or writing in it.
    $links = Get-DeckLinkProblems $deckDir
    if ($links) {
      if (-not $script:LinkWarned[$deckDir]) { Write-Host "   bridge: refusing $deckDir ($($links -join '; '))" -ForegroundColor Red; $script:LinkWarned[$deckDir] = $true }
      continue
    }
    foreach ($r in @(Get-ChildItem -LiteralPath $bridge -Filter 'request-*.json' -File -ErrorAction SilentlyContinue)) {
      if ($r.BaseName -notmatch '^request-(\d{1,20})$') { continue }
      $id = $Matches[1]
      Remove-Item -LiteralPath $r.FullName -ErrorAction SilentlyContinue   # tells the requester the build started
      $res = Join-Path $bridge "result-$id.json"
      $t = Get-Date
      $b = Invoke-DeckBuild $deckDir
      $seconds = [int]((Get-Date) - $t).TotalSeconds
      if ($b.Refused) { Write-BridgeJson $res @{ id = $id; refused = $b.Refused } }
      else { Write-BridgeJson $res @{ id = $id; exit = $b.Code; seconds = $seconds } }
      $log = Join-Path $deckDir 'out\build-log.txt'
      $problems = if (Test-Path -LiteralPath $log) { @(Get-Content -LiteralPath $log | Where-Object { $_ -match '^PROBLEM' }).Count } else { 0 }
      [pscustomobject]@{ Deck = $deckDir; Code = $b.Code; Ok = ($b.Code -eq 0); Hash = (Get-DeckSourceHash $deckDir); Problems = $problems; Refused = $b.Refused }
    }
  }
}
