param(
  [string]$TaskName = 'QSteelCAD Revenge Protocol'
)
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
