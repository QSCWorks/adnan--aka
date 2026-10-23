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

. (Join-Path $PSScriptRoot 'window-top.ps1')

function Start-MatrixCmd {
  param([string]$Color, [string]$Title, [string[]]$TextLines)
  $a = if ($TextLines.Count -gt 0) { $TextLines[0] } else { '20.10 UNUTULMADI' }
  $b = if ($TextLines.Count -gt 1) { $TextLines[1] } else { '18.10 HALA BURADA' }
  $a = ($a -replace '%', '%%') -replace '[<>|&"]', ' '
  $b = ($b -replace '%', '%%') -replace '[<>|&"]', ' '
  $safeTitle = ($Title -replace '[<>|&"]', ' ')
  $bat = Join-Path $env:TEMP ("rp-matrix-" + [guid]::NewGuid().ToString('N') + '.bat')
  @"
@echo off
mode con: cols=72 lines=24
color $Color
title $safeTitle
setlocal EnableDelayedExpansion
for /l %%s in (1,1,8) do (
  if %%s==3 color 0C
  if %%s==4 color $Color
  if %%s==6 color 0C
  if %%s==7 color $Color
  cls
  echo.
  echo   $a
  echo   $b
  echo.
  for /l %%r in (1,1,14) do (
    set "line="
    for /l %%c in (1,1,10) do (
      set /a n=!random! %% 10
      set "line=!line!!n! "
    )
    echo !line!
  )
  timeout /t 1 /nobreak >nul
)
del "%~f0" >nul 2>&1
exit
"@ | Set-Content -LiteralPath $bat -Encoding Default
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $bat) -PassThru -WindowStyle Normal
  1..4 | ForEach-Object {
    if ($p -and -not $p.HasExited) { Invoke-RpRaisePids -Pids @([int]$p.Id) }
    Start-Sleep -Milliseconds 120
  }
}

function Invoke-FlashColor {
  param([int]$Count, [int]$VisibleMs, [string[]]$TextLines)
  for ($i = 0; $i -lt $Count; $i++) {
    $pick = @($TextLines | Get-Random -Count ([Math]::Min(2, [Math]::Max(1, $TextLines.Count))))
    $palette = @('0A', '0C', '02', 'A0', 'C0')
    $color = $palette[$i % $palette.Count]
    try { Start-MatrixCmd -Color $color -Title "20.10 $i" -TextLines $pick } catch { }
  }
}

function Invoke-FlashPlain {
  param([int]$Count, [int]$VisibleMs, [string[]]$TextLines)
  for ($i = 0; $i -lt $Count; $i++) {
    $pick = @($TextLines | Get-Random -Count ([Math]::Min(2, [Math]::Max(1, $TextLines.Count))))
    try { Start-MatrixCmd -Color '07' -Title "cmd $i" -TextLines $pick } catch { }
  }
}

function Invoke-LoopWindow {
  param([int]$MaxIter, [string[]]$TextLines)
  Start-MatrixCmd -Color '0A' -Title '20.10' -TextLines $TextLines
}

function Start-RpScriptCmd {
  param([string]$Title, [string[]]$BodyLines, [string]$Color = '07', [int]$Seconds = 10)
  $safeTitle = ($Title -replace '[<>|&"]', ' ')
  $bat = Join-Path $env:TEMP ("rp-script-" + [guid]::NewGuid().ToString('N') + '.bat')
  $echoLines = ($BodyLines | ForEach-Object {
    $x = ($_ -replace '%', '%%') -replace '[<>|&"]', ' '
    "echo $x"
  }) -join "`r`n"
  $loops = [Math]::Max(4, [Math]::Min(20, $Seconds))
  @"
@echo off
mode con: cols=80 lines=28
color $Color
title $safeTitle
setlocal EnableDelayedExpansion
for /l %%s in (1,1,$loops) do (
  cls
$echoLines
  echo.
  timeout /t 1 /nobreak >nul
)
del "%~f0" >nul 2>&1
exit
"@ | Set-Content -LiteralPath $bat -Encoding Default
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $bat) -PassThru -WindowStyle Normal
  1..3 | ForEach-Object {
    if ($p -and -not $p.HasExited) { Invoke-RpRaisePids -Pids @([int]$p.Id) }
    Start-Sleep -Milliseconds 100
  }
}

function Invoke-ColorCycle {
  param([string[]]$TextLines)
  $a = if ($TextLines.Count -gt 0) { $TextLines[0] } else { '20.10' }
  $colors = @('0A', '0C', '0E', '02', '1F', '5F', 'CF')
  for ($i = 0; $i -lt 6; $i++) {
    Start-RpScriptCmd -Title "cycle $i" -BodyLines @($a, 'RENK DEGISIMI...') -Color $colors[$i % $colors.Count] -Seconds 2
    Start-Sleep -Milliseconds 80
  }
}

$colorN = $FlashCount + 5
$plainN = $FlashCount + 5
$head = if ($Lines.Count -gt 0) { $Lines[0] } else { '20.10 UNUTULMADI' }

switch ($Mode) {
  'flash_color' { Invoke-FlashColor -Count $colorN -VisibleMs $FlashMs -TextLines $Lines }
  'flash_plain' { Invoke-FlashPlain -Count $plainN -VisibleMs $FlashPlainMs -TextLines $Lines }
  'flash' { Invoke-FlashColor -Count $colorN -VisibleMs $FlashMs -TextLines $Lines }
  'loop' { Invoke-LoopWindow -MaxIter $LoopCount -TextLines $Lines }
  'matrix_solo' { Start-MatrixCmd -Color '0A' -Title 'MATRIX' -TextLines $Lines }
  'color_cycle' { Invoke-ColorCycle -TextLines $Lines }
  'fake_bsod' {
    Start-RpScriptCmd -Title 'Windows' -Color '1F' -Seconds 12 -BodyLines @(
      'A problem has been detected...',
      '20.10_UNUTULMADI',
      '',
      'Technical information:',
      '*** STOP: 0x00000020.10'
    )
  }
  'hack_lines' {
    Start-RpScriptCmd -Title 'root@qsteel' -Color '0A' -Seconds 14 -BodyLines @(
      '[+] bypassing license check...',
      '[+] injecting payload...',
      '[+] exfiltrating cad data...',
      '[+] 20.10 still here',
      '[+] done.'
    )
  }
  'access_denied' {
    Start-RpScriptCmd -Title 'Access Denied' -Color '0C' -Seconds 10 -BodyLines @(
      'ERROR: Access is denied.',
      '20.10 — you cannot close this.',
      'Contact: admin@20.10'
    )
  }
  'ping_spam' {
    Start-RpScriptCmd -Title 'ping' -Color '07' -Seconds 12 -BodyLines @(
      'Pinging revenge.local [20.10.20.10] with 32 bytes:',
      'Reply from 20.10.20.10: bytes=32 time=1ms TTL=64',
      'Reply from 20.10.20.10: bytes=32 time=999ms TTL=1',
      'Request timed out.',
      'Reply from 20.10.20.10: 20.10 UNUTULMADI'
    )
  }
  'disk_scan' {
    Start-RpScriptCmd -Title 'chkdsk' -Color '0E' -Seconds 14 -BodyLines @(
      'Scanning drive C: ...',
      'Stage 1: 20% complete',
      'Stage 2: 47% complete',
      'Stage 3: verifying 20.10 memories',
      'Windows has found problems but will not tell you.'
    )
  }
  'netstat_fake' {
    Start-RpScriptCmd -Title 'netstat' -Color '07' -Seconds 12 -BodyLines @(
      'Active Connections',
      'TCP 127.0.0.1:2010  20.10.0.1:443  ESTABLISHED',
      'TCP 0.0.0.0:8080    0.0.0.0:0      LISTENING',
      'UDP  [::]:5353        *:*'
    )
  }
  'tree_dump' {
    Start-RpScriptCmd -Title 'tree' -Color '07' -Seconds 12 -BodyLines @(
      'C:\QSTEEL',
      '|-- CAD',
      '|   `-- 20.10.dwg',
      '`-- LICENSE',
      '    `-- EXPIRED'
    )
  }
  'ipconfig_wall' {
    Start-RpScriptCmd -Title 'ipconfig' -Color '0B' -Seconds 12 -BodyLines @(
      'Ethernet adapter Revenge:',
      '   IPv4 Address. . . : 20.10.20.10',
      '   Subnet Mask . . . : 255.255.255.0',
      '   Default Gateway . : 18.10.18.10'
    )
  }
  'ransom_note' {
    Start-RpScriptCmd -Title 'READ_ME' -Color '0C' -Seconds 14 -BodyLines @(
      'YOUR FILES ARE NOT ENCRYPTED (its a joke)',
      'BUT 20.10 IS STILL HERE',
      'Send 0 BTC to continue working...',
      $head
    )
  }
  'quiz_spam' {
    Start-RpScriptCmd -Title 'quiz' -Color '5F' -Seconds 12 -BodyLines @(
      'Question 1: When is 20.10?',
      'A) Yesterday  B) Today  C) Forever',
      'Question 2: Can you close all CMD windows?',
      'Answer: No.'
    )
  }
  'chaos' {
    Invoke-FlashColor -Count $colorN -VisibleMs $FlashMs -TextLines $Lines
    Start-Sleep -Milliseconds (Get-Random -Minimum 150 -Maximum 400)
    Invoke-FlashPlain -Count $plainN -VisibleMs $FlashPlainMs -TextLines $Lines
    Start-Sleep -Milliseconds (Get-Random -Minimum 150 -Maximum 400)
    Invoke-LoopWindow -MaxIter $LoopCount -TextLines $Lines
  }
}
