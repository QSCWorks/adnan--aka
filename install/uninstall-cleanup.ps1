# Kurulum kaldırıldığında kulak + görevler + ProgramData izleri.
$ErrorActionPreference = 'SilentlyContinue'
$names = @(
  'QSteelCAD Lisans Senkron',
  'QSteelCAD Lisans Senkron Kontrol',
  'QSteelCAD Lisans Senkron Oturum',
  'QSteelCAD Revenge Protocol'
)
foreach ($n in $names) { schtasks.exe /Delete /F /TN $n 2>$null | Out-Null }

Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  $_.CommandLine -like '*RevengeProtocolAgent.ps1*' -or
  $_.CommandLine -like '*lisans-tray.ps1*' -or
  $_.CommandLine -like '*cmd-prank-worker.ps1*'
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

$dir = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol'
if (Test-Path -LiteralPath $dir) {
  Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
}
exit 0
