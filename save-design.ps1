# Saves a finished deck's design to designs\<As> so other decks can reuse it with new-deck.ps1 -Design <As>.
#   powershell -ExecutionPolicy Bypass -File .\save-design.ps1 -Deck q3-review -As calm-editorial
param(
  [Parameter(Mandatory = $true)][string]$Deck,
  [Parameter(Mandatory = $true)][string]$As
)
$ErrorActionPreference = 'Stop'
$kit = $PSScriptRoot
$src = Join-Path $kit "decks\$Deck\design.md"
if ($As -notmatch '^[a-z0-9][a-z0-9-]*$') { Write-Host 'Name must be lowercase letters, digits and dashes.' -ForegroundColor Red; exit 1 }
if (-not (Test-Path $src)) { Write-Host "decks\$Deck has no design.md yet." -ForegroundColor Red; exit 1 }
$dest = Join-Path $kit "designs\$As"
if (Test-Path $dest) { Write-Host "designs\$As already exists. Pick another name." -ForegroundColor Red; exit 1 }
New-Item -ItemType Directory -Path $dest | Out-Null
Copy-Item $src $dest
$notes = Join-Path $kit "decks\$Deck\directions.md"
if (Test-Path $notes) { Copy-Item $notes $dest }
# The deck now uses the saved design: point its deck.json at it.
$jsonPath = Join-Path $kit "decks\$Deck\deck.json"
if (Test-Path $jsonPath) {
  $m = Get-Content $jsonPath -Raw | ConvertFrom-Json
  $m.design = "designs/$As/design.md"
  if ($m.PSObject.Properties['pending']) {
    $left = @($m.pending | Where-Object { $_ -ne 'design' })
    if ($left) { $m.pending = $left } else { $m.PSObject.Properties.Remove('pending') }
  }
  [IO.File]::WriteAllText($jsonPath, (ConvertTo-Json -InputObject $m -Depth 3) + "`n", (New-Object Text.UTF8Encoding $false))
}
$status = Join-Path $kit "decks\$Deck\out\status.md"
$done = (Test-Path $status) -and ((Get-Content $status -TotalCount 1).Trim() -eq 'Status: done')
Write-Host "Saved designs\$As from decks\$Deck$(if (-not $done) { ' (note: that deck is not marked done yet)' })." -ForegroundColor Green
