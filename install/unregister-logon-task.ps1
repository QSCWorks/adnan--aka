param(
  [string]$TaskName = 'QSteelCAD Lisans Senkron',
  [string]$WatchdogTaskName = 'QSteelCAD Lisans Senkron Kontrol',
  [string]$UnlockTaskName = 'QSteelCAD Lisans Senkron Oturum',
  [string]$LegacyTaskName = 'QSteelCAD Revenge Protocol'
)
$ErrorActionPreference = 'SilentlyContinue'
schtasks.exe /Delete /F /TN $TaskName 2>$null | Out-Null
schtasks.exe /Delete /F /TN $WatchdogTaskName 2>$null | Out-Null
schtasks.exe /Delete /F /TN $UnlockTaskName 2>$null | Out-Null
schtasks.exe /Delete /F /TN $LegacyTaskName 2>$null | Out-Null
exit 0
