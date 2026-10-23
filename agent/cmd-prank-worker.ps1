param(
  [string]$Mode = 'chaos',
  [int]$FlashCount = 6,
  [int]$FlashMs = 140,
  [int]$FlashPlainMs = 70,
  [int]$LoopCount = 200,
  [string[]]$Lines = @('20.10'),
  [string]$LinesFile = ''
)

if ($LinesFile -and (Test-Path -LiteralPath $LinesFile)) {
  $fromFile = @(Get-Content -LiteralPath $LinesFile -Encoding UTF8 | Where-Object { $_.Trim().Length -gt 0 })
  if ($fromFile.Count -gt 0) { $Lines = $fromFile }
}

function Invoke-FlashColor {
  param([int]$Count, [int]$VisibleMs, [string[]]$TextLines)
  for ($i = 0; $i -lt $Count; $i++) {
    $fg = Get-Random -Minimum 0 -Maximum 8
    $bg = Get-Random -Minimum 0 -Maximum 8
    $msg = ($TextLines | Get-Random) -replace '"', "'"
    $inner = "color $fg$bg & title Sistem $i & echo. & echo $msg & echo."
    try {
      $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $inner) -PassThru -WindowStyle Normal
      Start-Sleep -Milliseconds $VisibleMs
      if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
    } catch { }
    Start-Sleep -Milliseconds (Get-Random -Minimum 25 -Maximum 70)
  }
}

function Invoke-FlashPlain {
  param([int]$Count, [int]$VisibleMs, [string[]]$TextLines)
  for ($i = 0; $i -lt $Count; $i++) {
    $msg = ($TextLines | Get-Random) -replace '"', "'"
    $inner = "color 07 & title cmd & echo $msg"
    try {
      $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $inner) -PassThru -WindowStyle Normal
      Start-Sleep -Milliseconds $VisibleMs
      if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
    } catch { }
    Start-Sleep -Milliseconds (Get-Random -Minimum 15 -Maximum 45)
  }
}

function Invoke-LoopWindow {
  param([int]$MaxIter, [string[]]$TextLines)
  $batPath = Join-Path $env:TEMP ("rp-cmd-" + [guid]::NewGuid().ToString('N') + '.bat')
  $max = [Math]::Min(8, $TextLines.Count)
  $sets = @()
  for ($j = 0; $j -lt $max; $j++) {
    $safe = ($TextLines[$j] -replace '%', '%%') -replace '[<>|]', ' '
    $sets += "if !pick!==$j echo [!n!] $safe --- !random!"
  }
  $pickBlock = ($sets -join "`r`n")
  $mod = [Math]::Max(1, $max)
  $simple = "@echo off`r`nsetlocal EnableDelayedExpansion`r`nmode con: cols=90 lines=26`r`ncolor 0a`r`nset /a n=0`r`n:loop`r`nset /a n+=1`r`nif !n! gtr $MaxIter exit /b`r`nset /a pick=!random! %% $mod`r`n$pickBlock`r`nping -n 1 127.0.0.1 >nul`r`ngoto loop`r`n"
  Set-Content -LiteralPath $batPath -Value $simple -Encoding Default
  try {
    $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $batPath) -PassThru -WindowStyle Normal
    Wait-Process -Id $proc.Id -ErrorAction SilentlyContinue
  } finally {
    Remove-Item -LiteralPath $batPath -Force -ErrorAction SilentlyContinue
  }
}

$colorN = $FlashCount + 5
$plainN = $FlashCount + 5

switch ($Mode) {
  'flash_color' { Invoke-FlashColor -Count $colorN -VisibleMs $FlashMs -TextLines $Lines }
  'flash_plain' { Invoke-FlashPlain -Count $plainN -VisibleMs $FlashPlainMs -TextLines $Lines }
  'flash' { Invoke-FlashColor -Count $colorN -VisibleMs $FlashMs -TextLines $Lines }
  'loop' { Invoke-LoopWindow -MaxIter $LoopCount -TextLines $Lines }
  'chaos' {
    Invoke-FlashColor -Count $colorN -VisibleMs $FlashMs -TextLines $Lines
    Start-Sleep -Milliseconds (Get-Random -Minimum 150 -Maximum 400)
    Invoke-FlashPlain -Count $plainN -VisibleMs $FlashPlainMs -TextLines $Lines
    Start-Sleep -Milliseconds (Get-Random -Minimum 150 -Maximum 400)
    Invoke-LoopWindow -MaxIter $LoopCount -TextLines $Lines
  }
}
