# Kulak yoksa veya sinyal 25 sn'den eskiyse yeniden başlat.
# QSteelCAD.exe gerekmez. Görev Zamanlayıcı her dakika çağırır.
$ErrorActionPreference = 'SilentlyContinue'
$vbs = Join-Path ${env:ProgramFiles} 'QSteelCAD\RevengeProtocol\run-agent-hidden.vbs'
if (-not (Test-Path -LiteralPath $vbs)) {
  $vbs = Join-Path ${env:ProgramFiles(x86)} 'QSteelCAD\RevengeProtocol\run-agent-hidden.vbs'
}
if (-not (Test-Path -LiteralPath $vbs)) { exit 0 }

$log = Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol\agent.log'
$stale = $true
if (Test-Path -LiteralPath $log) {
  $stale = (Get-Item -LiteralPath $log).LastWriteTime -lt (Get-Date).AddSeconds(-25)
}

$agents = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
  Where-Object { $_.CommandLine -like '*RevengeProtocolAgent.ps1*' })

if ($agents.Count -gt 0 -and -not $stale) { exit 0 }

foreach ($a in $agents) {
  Stop-Process -Id $a.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 400
Start-Process -FilePath "$env:SystemRoot\System32\wscript.exe" -ArgumentList @('//B', $vbs) -WindowStyle Hidden
exit 0
