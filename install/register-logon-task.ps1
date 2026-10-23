param(
  [Parameter(Mandatory = $true)][string]$AgentVbs,
  [Parameter(Mandatory = $true)][string]$TaskName = 'QSteelCAD Revenge Protocol'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $AgentVbs)) {
  throw "Baslatici bulunamadi: $AgentVbs"
}

$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$AgentVbs`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Gorev kaydedildi: $TaskName"
