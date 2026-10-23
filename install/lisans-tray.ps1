# QSteelCAD Lisans Senkron — tepsi simgesi (görünür), kulak + kontrol tamamen gizli.
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$mutex = New-Object System.Threading.Mutex($false, 'Global\QSteelCAD_LisansTray')
if (-not $mutex.WaitOne(0, $false)) { exit 0 }

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsAgent = Join-Path $root 'run-agent-hidden.vbs'
$ensure = Join-Path $root 'ensure-agent-running.ps1'
$iconPath = Join-Path ${env:ProgramFiles} 'QSteelCAD\qsteelcad_logo.ico'
if (-not (Test-Path -LiteralPath $iconPath)) {
  $iconPath = Join-Path $root 'qsteelcad_logo.ico'
}

function Start-AgentHidden {
  if (Test-Path -LiteralPath $vbsAgent) {
    Start-Process -FilePath "$env:SystemRoot\System32\wscript.exe" -ArgumentList @('//B', $vbsAgent) -WindowStyle Hidden
  }
}

function Test-AgentHealthy {
  $log = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol\agent.log'
  $running = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*RevengeProtocolAgent.ps1*' } |
    Select-Object -First 1
  if (-not $running) { return $false }
  if (-not (Test-Path -LiteralPath $log)) { return $false }
  return (Get-Item -LiteralPath $log).LastWriteTime -gt (Get-Date).AddSeconds(-25)
}

function Ensure-Agent {
  if (Test-AgentHealthy) { return }
  $running = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*RevengeProtocolAgent.ps1*' }
  foreach ($p in $running) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 300
  if (Test-Path -LiteralPath $ensure) {
    Start-Process -FilePath "$env:SystemRoot\System32\wscript.exe" -ArgumentList @('//B', (Join-Path $root 'watchdog-hidden.vbs')) -WindowStyle Hidden
  } else {
    Start-AgentHidden
  }
}

Start-AgentHidden
Ensure-Agent

$notify = New-Object System.Windows.Forms.NotifyIcon
if (Test-Path -LiteralPath $iconPath) {
  $notify.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($iconPath)
} else {
  $notify.Icon = [System.Drawing.SystemIcons]::Application
}
$notify.Text = 'QSteelCAD Lisans Senkron'
$notify.Visible = $true

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 45000
$timer.Add_Tick({ Ensure-Agent })
$timer.Start()

[System.Windows.Forms.Application]::Run()
$notify.Dispose()
