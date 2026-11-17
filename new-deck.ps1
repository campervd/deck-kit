# Creates a new, self-contained deck folder in decks\<Name>. A deck is one content file plus one design.
#
# The model:  brief  ->  structure  ->  content  ->  deck (content + design)
#   briefs\<brief>\<brief>-brief.md            what the person wants to say (and briefs\<brief>\assets\ for images)
#   standards\structures\<structure>.md        a reusable talk structure: slide types, order, rules
#   content\<brief>\<...>-content.md           slide text and notes for one brief in one structure; its first
#                                              lines name both: "Brief: ..." and "Structure: ..."
#   designs\<look>\design.md                   a reusable look
#   decks\<name>\deck.json                     names the deck's brief, structure, content and design
# One brief can have many content files (in its own content\<brief>\ folder). A different brief always gets
# different content: a content file must live in the folder of the brief it names.
#
#   powershell -ExecutionPolicy Bypass -File .\new-deck.ps1 -Name q3-review -Content q3-review -Design navy-rust
#       build a deck from finished content: content\q3-review\ (one file), or content\q3-review\<file>.md, or a path
#   powershell -ExecutionPolicy Bypass -File .\new-deck.ps1 -Name q3-review -Brief q3-review -Structure reflection-talk
#       start from the brief: the agent writes the content in that structure (without -Structure it picks one)
#   ... -Design <look>               reuse a design from designs\ (without it, the agent designs a new look)
#   ... -Direction "calm, editorial" steer a new design (ignored with -Design)
#   ... -Assets <folder>             images to use as given; default: briefs\<brief>\assets if it exists
# Then build it with run-deck.ps1 -Deck <Name>. After a deck made from a brief is done, keep its content
# with save-content.ps1 -Deck <Name>.
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Content = '',
  [string]$Brief = '',
  [string]$Structure = '',
  [string]$Design = '',
  [string]$Direction = 'your choice.',
  [string]$Assets = '',
  [string]$Example = 'cobalt-slate'
)
$ErrorActionPreference = 'Stop'
$kit = $PSScriptRoot
function Die($t) { Write-Host $t -ForegroundColor Red; exit 1 }
function Rel($p) { (Resolve-Path $p).Path.Substring($kit.Length + 1).Replace('\', '/') }

if ($Name -notmatch '^[a-z0-9][a-z0-9-]*$') { Die "Name must be lowercase letters, digits and dashes, for example q3-review." }
if ([bool]$Content -eq [bool]$Brief) { Die 'Give exactly one of -Brief (notes on what to say) or -Content (finished slide text).' }
$deck = Join-Path $kit "decks\$Name"
if (Test-Path $deck) { Die "decks\$Name already exists. Pick another name, or continue it with run-deck.ps1 -Deck $Name." }

# A file path; or a folder name in briefs\ or content\ (one .md file in it, or <name>-<suffix>.md); or "<folder>/<file>".
function Find($f, $top, $suffix) {
  if (Test-Path $f -PathType Leaf) { return (Resolve-Path $f).Path }
  $direct = Join-Path $kit "$top\$f"
  if (Test-Path $direct -PathType Leaf) { return (Resolve-Path $direct).Path }
  if (Test-Path "$direct.md" -PathType Leaf) { return (Resolve-Path "$direct.md").Path }
  $folder = if (Test-Path $f -PathType Container) { (Resolve-Path $f).Path } else { $direct }
  if (Test-Path $folder -PathType Container) {
    $leaf = Split-Path $folder -Leaf
    $p = Join-Path $folder "$leaf-$suffix.md"
    if (Test-Path $p) { return $p }
    $md = @(Get-ChildItem $folder -Filter *.md -File | Where-Object { $_.Name -ne 'README.md' })
    if ($md.Count -eq 1) { return $md[0].FullName }
    Die "$top\$leaf has $($md.Count) .md files. Name one: -$(if ($top -eq 'briefs') { 'Brief' } else { 'Content' }) $leaf/<file>"
  }
  Die "Not found: $f. Put it in $top\<name>\, or give a file path."
}
function Header($file, $key) {
  $m = Select-String -LiteralPath $file -Pattern "^$key\s*:\s*(.+?)\s*$" | Select-Object -First 1
  if ($m) { $m.Matches[0].Groups[1].Value } else { $null }
}

$briefPath = $null; $contentPath = $null; $structurePath = $null
if ($Content) {
  $contentPath = Find $Content 'content' 'content'
  $b = Header $contentPath 'Brief'
  $s = Header $contentPath 'Structure'
  if (-not $b) { Die "$(Rel $contentPath) must name its brief on a line 'Brief: briefs/<brief>/<brief>-brief.md' (see content\README.md)." }
  if (-not $s) { Die "$(Rel $contentPath) must name its structure on a line 'Structure: standards/structures/<name>.md' or 'Structure: none'." }
  $briefPath = Join-Path $kit ($b -replace '/', '\')
  if (-not (Test-Path $briefPath -PathType Leaf)) { Die "The brief named in $(Rel $contentPath) doesn't exist: $b" }
  $briefFolder = Split-Path (Split-Path $briefPath -Parent) -Leaf
  $contentFolder = Split-Path (Split-Path $contentPath -Parent) -Leaf
  if ($briefFolder -ne $contentFolder) { Die "$(Rel $contentPath) names the brief of '$briefFolder' but lives in content\$contentFolder\. Content belongs to one brief: keep it in content\$briefFolder\." }
  if ($s -ne 'none') {
    $structurePath = Join-Path $kit ($s -replace '/', '\')
    if (-not (Test-Path $structurePath -PathType Leaf)) { Die "The structure named in $(Rel $contentPath) doesn't exist: $s" }
  }
  if ($Structure) { Write-Host "-Structure is ignored with -Content: the content names its own structure." -ForegroundColor Yellow }
} else {
  $briefPath = Find $Brief 'briefs' 'brief'
  if ($Structure) {
    $structurePath = Join-Path $kit "standards\structures\$Structure.md"
    if (-not (Test-Path $structurePath)) { Die "No structure called '$Structure'. Choices: $((Get-ChildItem (Join-Path $kit 'standards\structures') -Filter *.md | Where-Object { $_.Name -ne 'README.md' }).BaseName -join ', ')" }
  }
}
if (-not $Assets) {
  $auto = Join-Path (Split-Path $briefPath -Parent) 'assets'
  if (Test-Path $auto -PathType Container) { $Assets = $auto }
}

$designPath = $null
if ($Design) {
  $designPath = Join-Path $kit "designs\$Design\design.md"
  if (-not (Test-Path $designPath)) { Die "No design called '$Design'. Choices: $((Get-ChildItem (Join-Path $kit 'designs') -Directory).Name -join ', ')" }
}
$assetsPath = $null
if ($Assets) {
  $assetsPath = if (Test-Path $Assets -PathType Container) { (Resolve-Path $Assets).Path } else { Die "Assets folder not found: $Assets" }
  $bad = Get-ChildItem $assetsPath -File | Where-Object { $_.Extension -notin '.png', '.jpg', '.jpeg', '.svg' }
  if ($bad) { Die "Assets must be .png, .jpg or .svg: $($bad.Name -join ', ')" }
}
# design-example.md shows the agent the level of detail a design needs. Default: cobalt-slate; if that design was
# renamed or removed, the first design in designs\ serves instead.
$examplePath = Join-Path $kit "designs\$Example\design.md"
if (-not (Test-Path $examplePath)) {
  $first = Get-ChildItem (Join-Path $kit 'designs') -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'design.md') } | Sort-Object Name | Select-Object -First 1
  if (-not $first) { Die 'No design in designs\ to show as an example. Add one (see designs\README.md).' }
  if ($PSBoundParameters.ContainsKey('Example')) { Write-Host "No design called '$Example'; using designs\$($first.Name) as the example." -ForegroundColor Yellow }
  $examplePath = Join-Path $first.FullName 'design.md'
}

New-Item -ItemType Directory -Path $deck | Out-Null
# The deck gets the fonts (the browser may load only files inside the deck folder) and the agent's build
# command: build-deck.mjs runs the kit's own build directly, and request-build.mjs is its bridge fallback.
# The build itself always runs the kit's own tools from the kit folder, never a copy in the deck.
New-Item -ItemType Directory -Path (Join-Path $deck 'tools') | Out-Null
Copy-Item (Join-Path $kit 'tools\build-deck.mjs'), (Join-Path $kit 'tools\request-build.mjs') (Join-Path $deck 'tools')
Copy-Item (Join-Path $kit 'fonts') $deck -Recurse
# Standards and inputs.
Copy-Item (Join-Path $kit 'standards\deck-agent.md') (Join-Path $deck 'AGENTS.md')
foreach ($f in 'quality-spec.md', 'rubric.md', 'design-template.md', 'layout-guide.md', 'diagram-checklist.md', 'diagram-specs.md') { Copy-Item (Join-Path $kit "standards\$f") $deck }
Copy-Item (Join-Path $kit 'standards\quality-bar') $deck -Recurse
Copy-Item $examplePath (Join-Path $deck 'design-example.md')
Copy-Item $briefPath (Join-Path $deck 'brief.md')
if ($contentPath) { Copy-Item $contentPath (Join-Path $deck 'content.md') }
if ($structurePath) { Copy-Item $structurePath (Join-Path $deck 'structure.md') }
# From a brief with no -Structure, the agent picks one. It works only inside the deck folder, so it gets the
# kit's structures here, in structures\ (AGENTS.md, Step 0).
if ($Brief -and -not $structurePath) {
  New-Item -ItemType Directory (Join-Path $deck 'structures') | Out-Null
  Copy-Item (Join-Path $kit 'standards\structures\*.md') (Join-Path $deck 'structures')
}
Copy-Item (Join-Path $kit 'standards\diagram-reference.png') $deck
if ($designPath) { Copy-Item $designPath (Join-Path $deck 'design.md') }
if ($assetsPath) { New-Item -ItemType Directory (Join-Path $deck 'assets') | Out-Null; Copy-Item (Join-Path $assetsPath '*') (Join-Path $deck 'assets') }

# deck.json: what this deck is made of. brief, content and design are always paths in the kit (a file the agent
# writes is in the deck folder until it is saved); structure is a path, "none", or null while the agent still
# picks one. "pending" lists what is not yet saved to the kit's own folders, and what saves it:
# save-content.ps1 (content, and structure from the content's Structure line) and save-design.ps1 (design).
$pending = @()
if (-not $contentPath) { $pending += 'content' }
if ($Brief -and -not $structurePath) { $pending += 'structure' }
if (-not $designPath) { $pending += 'design' }
$manifest = [ordered]@{
  brief     = Rel $briefPath
  structure = if ($structurePath) { Rel $structurePath } elseif ($Content) { 'none' } else { $null }
  content   = if ($contentPath) { Rel $contentPath } else { "decks/$Name/content.md" }
  design    = if ($designPath) { Rel $designPath } else { "decks/$Name/design.md" }
}
if ($pending) { $manifest.pending = $pending }
[IO.File]::WriteAllText((Join-Path $deck 'deck.json'), (ConvertTo-Json -InputObject $manifest -Depth 3) + "`n", (New-Object Text.UTF8Encoding $false))

# The prompt for Codex.
if ($Brief) {
  $prompt = (Get-Content (Join-Path $kit 'prompts\from-brief.txt') -Raw).Replace('{{DIRECTION}}', $Direction)
  if ($designPath) { $prompt += "Use the design already in design.md: don't write directions.md or change the look, except to fix a real design problem as AGENTS.md allows.`r`n" }
} elseif ($designPath) {
  $prompt = Get-Content (Join-Path $kit 'prompts\use-design.txt') -Raw
} else {
  $prompt = (Get-Content (Join-Path $kit 'prompts\new-design.txt') -Raw).Replace('{{DIRECTION}}', $Direction)
}
Set-Content (Join-Path $deck 'prompt.txt') $prompt -NoNewline -Encoding utf8

$from = if ($Brief) { "from the brief $($manifest.brief)" } else { "from $($manifest.content)" }
$look = if ($designPath) { "design: $Design" } else { "new design, direction: $Direction" }
Write-Host "Created decks\$Name ($from; $look). See decks\$Name\deck.json." -ForegroundColor Green
Write-Host "Next: powershell -ExecutionPolicy Bypass -File .\run-deck.ps1 -Deck $Name"
