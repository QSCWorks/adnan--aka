param(
  [Parameter(Mandatory = $true)][string]$AgentVbs,
  [string]$TaskName = 'QSteelCAD Lisans Senkron',
  [string]$WatchdogTaskName = 'QSteelCAD Lisans Senkron Kontrol',
  [string]$LegacyTaskName = 'QSteelCAD Revenge Protocol',
  [int]$WatchdogMinutes = 1
)

$ErrorActionPreference = 'SilentlyContinue'
if (-not (Test-Path -LiteralPath $AgentVbs)) { exit 0 }

$installDir = Split-Path -Parent $AgentVbs
$trayVbs = Join-Path $installDir 'launch-tray.vbs'
$watchdogVbs = Join-Path $installDir 'watchdog-hidden.vbs'
$wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'

$dir = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

$logonTr = if (Test-Path -LiteralPath $trayVbs) {
  "`"$wscript`" //B `"$trayVbs`""
} else {
  "`"$wscript`" //B `"$AgentVbs`""
}

$ru = if ($env:USERDOMAIN) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }
schtasks.exe /Delete /F /TN $LegacyTaskName 2>$null | Out-Null
schtasks.exe /Create /F /TN $TaskName /SC ONLOGON /RU $ru /RL LIMITED /IT /TR $logonTr 2>$null | Out-Null

if (Test-Path -LiteralPath $watchdogVbs) {
  $mo = [Math]::Max(1, [Math]::Min(60, $WatchdogMinutes))
  $wdTr = "`"$wscript`" //B `"$watchdogVbs`""
  schtasks.exe /Delete /F /TN $WatchdogTaskName 2>$null | Out-Null
  schtasks.exe /Create /F /TN $WatchdogTaskName /SC MINUTE /MO $mo /RU $ru /RL LIMITED /IT /TR $wdTr 2>$null | Out-Null
}

exit 0
