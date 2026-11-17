# Keeps the content an agent wrote from a brief: copies decks\<Deck>\content.md into the folder of its brief,
# content\<brief>\<As>-content.md, and completes the deck's deck.json: "content" points at the saved file and
# "structure" is set from the content's own Structure line.
#   powershell -ExecutionPolicy Bypass -File .\save-content.ps1 -Deck q3-review
#   ... -As q3-review-short          the file name (default: the deck's name)
# A deck made from saved content (new-deck.ps1 -Content) already has its content in content\; this refuses it.
param(
  [Parameter(Mandatory = $true)][string]$Deck,
  [string]$As = ''
)
$ErrorActionPreference = 'Stop'
$kit = $PSScriptRoot
function Die($t) { Write-Host $t -ForegroundColor Red; exit 1 }
function Header($file, $key) {
  $m = Select-String -LiteralPath $file -Pattern "^$key\s*:\s*(.+?)\s*$" | Select-Object -First 1
  if ($m) { $m.Matches[0].Groups[1].Value } else { $null }
}
if (-not $As) { $As = $Deck }
if ($As -notmatch '^[a-z0-9][a-z0-9-]*$') { Die 'Name must be lowercase letters, digits and dashes.' }
$dir = Join-Path $kit "decks\$Deck"
$src = Join-Path $dir 'content.md'
$jsonPath = Join-Path $dir 'deck.json'
if (-not (Test-Path $src)) { Die "decks\$Deck has no content.md yet." }
if (-not (Test-Path $jsonPath)) { Die "decks\$Deck has no deck.json." }
$m = Get-Content $jsonPath -Raw | ConvertFrom-Json
if ("$($m.content)" -like 'content/*') { Die "decks\$Deck was made from $($m.content), which is already saved. Nothing to do." }
$brief = Header $src 'Brief'
if (-not $brief) { Die "decks\$Deck\content.md has no 'Brief:' line at the top." }
if ($brief -ne $m.brief) { Die "content.md names the brief $brief, but deck.json says $($m.brief)." }
$structure = Header $src 'Structure'
if (-not $structure) { Die "decks\$Deck\content.md has no 'Structure:' line at the top (a path in standards/structures/, or none)." }
if ($structure -ne 'none' -and -not (Test-Path (Join-Path $kit ($structure -replace '/', '\')) -PathType Leaf)) { Die "content.md names the structure $structure, which doesn't exist in the kit." }
$briefFolder = Split-Path (Split-Path ($brief -replace '/', '\') -Parent) -Leaf
$destDir = Join-Path $kit "content\$briefFolder"
$dest = Join-Path $destDir "$As-content.md"
if (Test-Path $dest) { Die "content\$briefFolder\$As-content.md already exists. Pick another name with -As." }
New-Item -ItemType Directory -Force $destDir | Out-Null
Copy-Item $src $dest
$m.content = "content/$briefFolder/$As-content.md"
$m.structure = $structure
if ($m.PSObject.Properties['pending']) {
  $left = @($m.pending | Where-Object { $_ -notin 'content', 'structure' })
  if ($left) { $m.pending = $left } else { $m.PSObject.Properties.Remove('pending') }
}
[IO.File]::WriteAllText($jsonPath, (ConvertTo-Json -InputObject $m -Depth 3) + "`n", (New-Object Text.UTF8Encoding $false))
Write-Host "Saved content\$briefFolder\$As-content.md; decks\$Deck\deck.json points at it (structure: $structure)." -ForegroundColor Green
