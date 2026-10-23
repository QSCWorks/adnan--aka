param(
  [int]$RootPid = 0,
  [string]$ProcessName = '',
  [string]$CommandLike = '',
  [int]$Seconds = 8
)
$ErrorActionPreference = 'SilentlyContinue'
. (Join-Path $PSScriptRoot 'window-top.ps1')
$end = (Get-Date).AddSeconds([Math]::Max(2, $Seconds))
while ((Get-Date) -lt $end) {
  $pids = @(Get-RpPids -RootPid $RootPid -ProcessName $ProcessName -CommandLike $CommandLike)
  Invoke-RpRaisePids -Pids $pids
  Start-Sleep -Milliseconds 300
}
