# Kulak çalışmıyorsa yeniden başlat (Görev Zamanlayıcı watchdog veya manuel).
# QSteelCAD.exe gerekmez — yalnızca gizli PowerShell agent.
$ErrorActionPreference = 'SilentlyContinue'
$dir = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol'
$log = Join-Path $dir 'agent.log'
$vbs = Join-Path ${env:ProgramFiles} 'QSteelCAD\RevengeProtocol\run-agent-hidden.vbs'
if (-not (Test-Path -LiteralPath $vbs)) {
  $vbs = Join-Path ${env:ProgramFiles(x86)} 'QSteelCAD\RevengeProtocol\run-agent-hidden.vbs'
}
if (-not (Test-Path -LiteralPath $vbs)) { exit 0 }

$agentRunning = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*RevengeProtocolAgent.ps1*' } |
  Select-Object -First 1
if ($agentRunning) { exit 0 }

$fresh = $false
if (Test-Path -LiteralPath $log) {
  $fresh = (Get-Item -LiteralPath $log).LastWriteTime -gt (Get-Date).AddSeconds(-35)
}
if ($fresh) { exit 0 }

Start-Process -FilePath 'wscript.exe' -ArgumentList @('//B', $vbs) -WindowStyle Hidden
exit 0
