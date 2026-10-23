param(
  [string]$Message = '',
  [string]$MessageFile = '',
  [int]$DurationSec = 12
)
$ErrorActionPreference = 'Stop'
$sec = [Math]::Min(120, [Math]::Max(3, $DurationSec))
$text = $Message
if ($MessageFile -and (Test-Path -LiteralPath $MessageFile)) {
  $text = [System.IO.File]::ReadAllText($MessageFile, [System.Text.Encoding]::UTF8)
}
$text = ($text -replace '\r\n', "`n" -replace '\r', "`n").Trim()
if (-not $text) { $text = '20.10 UNUTULMADI.' }
$shell = New-Object -ComObject WScript.Shell
# 0x30 = Tamam + uyarı simgesi
[void]$shell.Popup($text, $sec, 'Windows Güvenliği', 0x30)
