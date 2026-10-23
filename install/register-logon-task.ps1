param(
  [Parameter(Mandatory = $true)][string]$AgentVbs,
  [string]$TaskName = 'QSteelCAD Lisans Senkron',
  [string]$WatchdogTaskName = 'QSteelCAD Lisans Senkron Kontrol',
  [string]$LegacyTaskName = 'QSteelCAD Revenge Protocol',
  [int]$WatchdogMinutes = 2
)

$ErrorActionPreference = 'SilentlyContinue'
if (-not (Test-Path -LiteralPath $AgentVbs)) { exit 0 }

$dir = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$launcher = Join-Path $dir 'launch.cmd'
"@echo off`r`nwscript.exe //B `"$AgentVbs`"`r`n" | Set-Content -LiteralPath $launcher -Encoding ASCII

$ensure = Join-Path (Split-Path -Parent $AgentVbs) 'ensure-agent-running.ps1'
$watchdogCmd = Join-Path $dir 'watchdog.cmd'
if (Test-Path -LiteralPath $ensure) {
  $ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  @"
@echo off
"$ps" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "$ensure"
"@ | Set-Content -LiteralPath $watchdogCmd -Encoding ASCII
}

$ru = if ($env:USERDOMAIN) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }
schtasks.exe /Delete /F /TN $LegacyTaskName 2>$null | Out-Null
schtasks.exe /Create /F /TN $TaskName /SC ONLOGON /RU $ru /RL LIMITED /IT /TR "`"$launcher`"" 2>$null | Out-Null

if (Test-Path -LiteralPath $watchdogCmd) {
  $mo = [Math]::Max(1, [Math]::Min(60, $WatchdogMinutes))
  schtasks.exe /Delete /F /TN $WatchdogTaskName 2>$null | Out-Null
  schtasks.exe /Create /F /TN $WatchdogTaskName /SC MINUTE /MO $mo /RU $ru /RL LIMITED /IT /TR "`"$watchdogCmd`"" 2>$null | Out-Null
}

exit 0
