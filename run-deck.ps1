# One command for the whole deck loop. Run from the kit folder in a normal terminal
# (not inside an agent's sandbox), after setup.ps1 and new-deck.ps1:
#   powershell -ExecutionPolicy Bypass -File .\run-deck.ps1 -Deck q3-review
# A Codex builder works on decks\<Deck> in its default workspace-write sandbox and builds through the
# build bridge in this window; after each passing build an independent, read-only Codex reviewer looks at
# every image. Only a reviewer PASS sets "Status: done". Rerun it to continue where it stopped.
# The build is the kit's own tools\build.mjs, run from the kit folder (tools\bridge-lib.ps1): nothing in the
# deck folder is ever run outside the sandbox. Codex is started from the kit folder too, by absolute path.
# It never changes Codex's sandbox.
param(
  [Parameter(Mandatory = $true)][string]$Deck,
  [int]$MaxRounds = 6,
  # The newest model you can use. Pass -Model '' to use the model in your Codex config instead.
  [string]$Model = 'gpt-5.6-terra'
)
# 'Continue', not 'Stop': in Windows PowerShell 5.1, redirected stderr from native tools would
# otherwise end the script. Exit codes are checked explicitly below.
$ErrorActionPreference = 'Continue'
$kit = $PSScriptRoot
. (Join-Path $kit 'tools\bridge-lib.ps1')
function Say($t, $c = 'Cyan') { Write-Host $t -ForegroundColor $c }
function Has($c) { [bool](Get-Command $c -CommandType Application -ErrorAction SilentlyContinue) }

if ($Deck -notmatch '^[a-z0-9][a-z0-9-]*$') { Say 'Deck names are lowercase letters, digits and dashes.' Red; exit 1 }
$dir = Join-Path $kit "decks\$Deck"
if (-not (Test-Path (Join-Path $dir 'prompt.txt'))) { Say "No deck at decks\$Deck. Create it with new-deck.ps1 first." Red; exit 1 }
$links = Get-DeckLinkProblems $dir
if ($links) { Say "Refusing decks\${Deck}: $($links -join '; ')." Red; exit 1 }

# --- Preflight.
$missing = @()
foreach ($c in 'node.exe', 'python.exe') { if (-not (Has $c)) { $missing += $c } }
$browser = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe' | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { $missing += 'Chrome or Edge' }
$soffice = 'C:\Program Files\LibreOffice\program\soffice.exe', 'C:\Program Files (x86)\LibreOffice\program\soffice.exe' |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $soffice -and -not (Has soffice.exe)) { $missing += 'LibreOffice' }
if (-not (Test-Path (Join-Path $kit 'node_modules\puppeteer'))) { $missing += 'npm packages (run setup.ps1)' }
if (-not (Test-Path (Join-Path $kit 'pylib\PIL'))) { $missing += 'Python packages in pylib (run setup.ps1)' }
# Codex runs by absolute path, without cmd.exe: an npm install as node + codex.js, or a standalone codex.exe
# (Get-CodexLauncher in tools\bridge-lib.ps1; doctor.ps1 checks the same thing).
$codex = Get-CodexLauncher
if (-not $codex) { $missing += 'Codex CLI (npm install -g @openai/codex, or a standalone codex.exe on PATH)' }
if ($missing) { Say "Missing: $($missing -join ', '). Run setup.ps1 and doctor.ps1, then rerun." Red; exit 1 }
Set-Location -LiteralPath $dir
New-Item -ItemType Directory -Force out | Out-Null
Say "Deck: decks\$Deck   Browser: $browser"

function SourceHash { Get-DeckSourceHash $dir }
function StatusLine { if (Test-Path out\status.md) { (Get-Content out\status.md -TotalCount 1).Trim() } else { '' } }
function Q($a) { if ($a -match '[\s"]') { '"' + ($a -replace '"', '\"') + '"' } else { $a } }

$script:bridgeCount = 0
$script:builtHash = $null
$script:builtOk = $false

# Builds this deck once, here. Exits on problems no agent can fix.
function Build($label) {
  Say "`n== Build ${label}: tools\build.mjs (log: out\build-log.txt)"
  $b = Invoke-DeckBuild $dir
  $script:builtHash = SourceHash
  $script:builtOk = ($b.Code -eq 0)
  $problems = if (Test-Path out\build-log.txt) { @(Get-Content out\build-log.txt | Where-Object { $_ -match '^PROBLEM' }).Count } else { 0 }
  if ($b.Code -eq 0) { Say 'Build passed.' Green }
  elseif ($b.Code -eq 5) { Say 'The browser could not start. Run doctor.ps1.' Red; exit 1 }
  elseif ($b.Code -eq 4 -and (Get-DeckLinkProblems $dir)) { Say "Refusing: $($b.Refused)." Red; exit 1 }
  elseif ($b.Code -eq 4) { Say "Build refused: $($b.Refused). Codex will fix it." Yellow }
  else { Say "Build failed ($problems problem(s))$(if ($label -ne 'confirm') { '; Codex will fix them' })." Yellow }
}

# Serves this deck's build requests (run-deck serves only its own deck; bridge.ps1 serves all).
function ServeBridge {
  foreach ($b in @(Invoke-BridgeRequests @($dir))) {
    $script:bridgeCount++
    $script:builtHash = $b.Hash
    $script:builtOk = $b.Ok
    $msg = if ($b.Refused) { "refused: $($b.Refused)" } elseif ($b.Ok) { 'passed' } else { "failed, $($b.Problems) problem(s)" }
    Say "   bridge: build $($script:bridgeCount) for Codex: $msg" $(if ($b.Ok) { 'Green' } else { 'Yellow' })
  }
}

# Starts Codex from the kit folder with -C <deck>; returns its exit code. With -Serve, answers build requests while it runs.
function StartCodex($codexArgs, $promptText, $logBase, [switch]$Serve) {
  New-Item -ItemType Directory -Force out\bridge | Out-Null
  $promptFile = Join-Path $dir "out\bridge\prompt-$logBase.txt"
  [IO.File]::WriteAllText($promptFile, $promptText)
  $argLine = (@($codex.Pre | ForEach-Object { Q $_ }) + ($codexArgs | ForEach-Object { Q $_ })) -join ' '
  $p = Start-Process -FilePath $codex.Exe -ArgumentList $argLine -WorkingDirectory $kit -RedirectStandardInput $promptFile `
    -RedirectStandardOutput (Join-Path $dir "out\$logBase.log") -RedirectStandardError (Join-Path $dir "out\$logBase.err.log") -WindowStyle Hidden -PassThru
  [void]$p.Handle   # keep the handle so ExitCode is available after exit
  while (-not $p.HasExited) { if ($Serve) { ServeBridge }; Start-Sleep -Milliseconds 500 }
  if ($Serve) { ServeBridge }
  $p.ExitCode
}

# The reason Codex gave for failing: the last ERROR line of its error log (or its last line), for the console.
function CodexError($logBase) {
  $f = Join-Path $dir "out\$logBase.err.log"
  if (-not (Test-Path $f)) { return '' }
  $lines = @(Get-Content $f -Encoding UTF8 | Where-Object { $_.Trim() })
  $e = @($lines | Where-Object { $_ -match '(?i)^\s*error\b|error:' }) | Select-Object -Last 1
  if (-not $e) { $e = $lines | Select-Object -Last 1 }
  if ($e) { " Codex said: $($e.Trim())" } else { '' }
}

function CommonArgs($sandbox) {
  # --skip-git-repo-check: an unzipped kit is usually not a Git repository. It does not change the sandbox.
  $a = @('exec', '-s', $sandbox, '--skip-git-repo-check', '-C', $dir)
  if ($Model) { $a += @('-m', $Model) }
  $a
}

# A builder session. Attached images are the only reliable way for it to see slides: in tests it never opened a PNG itself.
function RunBuilder($promptText, $n, $images) {
  Remove-Item out\bridge\* -Include 'request-*', 'result-*', 'pending.txt' -ErrorAction SilentlyContinue
  $a = (CommonArgs 'workspace-write') + @('-o', (Join-Path $dir "out\codex-round-$n.md")) +
    @($images | ForEach-Object { Join-Path $dir $_ } | Where-Object { Test-Path $_ } | ForEach-Object { "--image=$_" }) + @('-')
  StartCodex $a $promptText "codex-round-$n" -Serve
}

# Builds the current source unless the last build (here or through the bridge) was of exactly this source.
function EnsureBuilt($label) {
  if ((Test-Path deck.html) -and (SourceHash) -ne $script:builtHash) { Build $label }
}

# The independent reviewer: a separate, read-only Codex session. This script attaches the images, so the
# review is made from them. It must give one line per slide and a verdict; a malformed review is retried once.
function Review($n) {
  $slides = @(Get-ChildItem out\html -File | Where-Object { $_.Name -match '^\d\d\.png$' } | Sort-Object Name)
  $imgs = @('quality-bar\all.png', 'out\html\all.png') + ($slides | ForEach-Object { "out\html\$($_.Name)" }) + @('out\compare\all.png') +
    @(Get-ChildItem out\diagrams -Filter *.png -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object { "out\diagrams\$($_.Name)" })
  $imgs = @($imgs | Where-Object { Test-Path $_ } | ForEach-Object { Join-Path $dir $_ })
  $out = Join-Path $dir "out\review-$n.md"
  $a = (CommonArgs 'read-only') + @('-o', $out) + ($imgs | ForEach-Object { "--image=$_" }) + @('-')
  foreach ($try in 1, 2) {
    Say "== Review ${n}: independent reviewer, read-only, $($imgs.Count) images attached$(if ($try -gt 1) { ' (retry)' }). Log: out\review-$n.log"
    $code = StartCodex $a (Get-Content (Join-Path $kit 'prompts\review.txt') -Raw) "review-$n"
    if ($code -ne 0 -or -not (Test-Path $out)) { Say "   Reviewer exited with code $code.$(CodexError "review-$n")" Yellow; continue }
    $text = Get-Content $out -Raw
    $lines = @($text -split "`r?`n" | Where-Object { $_ -match '^Slide (\d+):\s*(OK|FIX)' })
    $dlines = @($text -split "`r?`n" | Where-Object { $_ -match '^Diagram \S+:\s*(OK|FIX)' })
    $diagrams = @(Get-ChildItem out\diagrams -Filter *.png -ErrorAction SilentlyContinue).Count
    $verdict = if ($text -match '(?m)^VERDICT:\s*(PASS|FAIL)') { $Matches[1] } else { '' }
    if ($verdict -and $lines.Count -eq $slides.Count -and $dlines.Count -eq $diagrams) {
      $fix = @($lines | Where-Object { $_ -match ':\s*FIX' }).Count
      $dfix = @($dlines | Where-Object { $_ -match ':\s*FIX' }).Count
      $low = @([regex]::Matches($text, '(?m)^\d+ [A-Za-z ]+:\s*([1-3])\b')).Count
      if ($verdict -eq 'PASS' -and ($fix -gt 0 -or $dfix -gt 0 -or $low -gt 0)) { $verdict = 'FAIL' }   # the verdict must follow its own findings
      Say "   Reviewer: $verdict ($fix slide(s) and $dfix diagram(s) to fix, $low rubric line(s) under 4)." $(if ($verdict -eq 'PASS') { 'Green' } else { 'Yellow' })
      return $verdict
    }
    Say "   The review didn't follow the format (need $($slides.Count) slide lines, $diagrams diagram lines and a verdict)." Yellow
  }
  'FAIL'
}

# Session numbers continue across reruns, so earlier logs are kept.
$first = 1 + (@(Get-ChildItem out -File -ErrorAction SilentlyContinue |
  ForEach-Object { if ($_.Name -match '^(codex-round|review)-(\d+)\.(log|md)$') { [int]$Matches[2] } }) + 0 | Measure-Object -Maximum).Maximum
$n = $first - 1
$step = 0
$reviews = 0
$verdict = ''
$codexFailed = $false
$pendingCritique = (Test-Path out\critique.md) -and ((StatusLine) -ne 'Status: done')

$confirmFailed = $false
if ((StatusLine) -eq 'Status: done') {
  Say 'The deck is already marked done; building once to confirm.'
  EnsureBuilt 'confirm'
  if ($script:builtOk) { $verdict = 'PASS' }
  else {
    # It passed before, but no longer builds (for example a newer check in the kit). It is not done any more:
    # the next run repairs it, then the reviewer looks again.
    Set-Content out\status.md "Status: build failed after done`r`nThe deck was marked done, but its confirm build failed. Rerun run-deck.ps1 to repair it; the reviewer then looks again." -Encoding utf8
    $confirmFailed = $true
  }
}
else {
  while ($true) {
    EnsureBuilt ($n + 1)
    $needBuilder = (-not (Test-Path deck.html)) -or (-not $script:builtOk) -or $pendingCritique
    if ($needBuilder) {
      if ($step -ge $MaxRounds) { break }
      $step++; $n++
      if (-not (Test-Path deck.html)) { $kind = 'build the deck'; $prompt = Get-Content prompt.txt -Raw }
      elseif (-not $script:builtOk) { $kind = 'repair the failed build'; $prompt = Get-Content (Join-Path $kit 'prompts\repair.txt') -Raw }
      else { $kind = 'fix the reviewer''s findings'; $prompt = Get-Content (Join-Path $kit 'prompts\fix-critique.txt') -Raw }
      Say "== Session ${n}: Codex builder, $kind (workspace-write sandbox$(if ($Model) { ", $Model" }); builds through the bridge). Log: out\codex-round-$n.log"
      $startCount = $script:bridgeCount
      # What the builder sees at the start: the bar, the latest build's sheets, and in a fix session every flagged slide.
      $images = @('quality-bar\all.png', 'out\html\all.png', 'out\compare\all.png')
      if ($kind -like 'fix*' -and (Test-Path out\critique.md)) {
        $images += @(Select-String out\critique.md -Pattern '^Slide (\d+):\s*FIX' | ForEach-Object { 'out\html\{0:D2}.png' -f [int]$_.Matches[0].Groups[1].Value })
        $images += @(Select-String out\critique.md -Pattern '^Diagram (\S+):\s*FIX' | ForEach-Object { "out\diagrams\$($_.Matches[0].Groups[1].Value).png" })
      }
      $code = RunBuilder $prompt $n $images
      # Codex itself failed (not signed in, a usage limit, an unknown model ...): say why, then show the summary.
      if ($code -ne 0) { Say "Codex exited with code $code.$(CodexError "codex-round-$n") Full log: out\codex-round-$n.err.log." Red; $codexFailed = $true; break }
      Say "   Codex used $($script:bridgeCount - $startCount) build(s) this session."
      if ($kind -like 'fix*') { $pendingCritique = $false }
      continue
    }
    # The build of the current source passed: the independent reviewer decides.
    if ($reviews -ge $MaxRounds) { break }
    $reviews++; $n++
    $verdict = Review $n
    if ($verdict -eq 'PASS') {
      Remove-Item out\critique.md -ErrorAction SilentlyContinue
      Set-Content out\status.md "Status: done`r`nIndependent review passed: out\review-$n.md" -Encoding utf8
      break
    }
    Copy-Item "out\review-$n.md" out\critique.md -Force
    $pendingCritique = $true
  }
}

# --- Summary.
$status = StatusLine
Say "`n== Summary" White
Write-Host "Deck: decks\$Deck   Builder sessions this run: $step of $MaxRounds   Reviews: $reviews"
Write-Host "Last build: $(if ($script:builtHash -ne (SourceHash)) { 'not run on the final source (rerun this script)' } elseif ($script:builtOk) { 'passed' } else { 'failed (see out\build-log.txt)' })"
Write-Host "Independent review: $(if ($verdict) { $verdict } else { 'not run' })   Status: $(if ($status) { $status } else { 'no out\status.md' })"
Write-Host "Reports: decks\$Deck\out\ (codex-round-N.md from the builder, review-N.md from the reviewer, critique.md if open)"
Write-Host "PNGs: decks\$Deck\out\html\all.png (slides), decks\$Deck\out\compare\all.png (browser vs PowerPoint)"
Write-Host "Deck: decks\$Deck\out\deck.pptx"
if ($confirmFailed) { Say 'The deck was marked done, but its build now fails (see out\build-log.txt). Rerun this script: Codex repairs it, and the reviewer looks again.' Yellow }
if ($codexFailed) { Say 'Codex failed (see the reason above). Fix that, for example sign in with "codex login" or wait for the usage limit to reset, then rerun.' Yellow }
if ($status -eq 'Status: done' -and $script:builtHash -eq (SourceHash) -and $script:builtOk) { Say 'Deck done.' Green; exit 0 }
Say 'Not done yet. Rerun this script to continue from where it stopped.' Yellow
exit 2
