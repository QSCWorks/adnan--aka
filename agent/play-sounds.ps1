param([int]$DurationSec = 60)
$ErrorActionPreference = 'SilentlyContinue'
if ($DurationSec -lt 1) { $DurationSec = 60 }
Add-Type -AssemblyName System.Media
$end = (Get-Date).AddSeconds($DurationSec)
$players = @(
  { [System.Media.SystemSounds]::Asterisk.Play() },
  { [System.Media.SystemSounds]::Exclamation.Play() },
  { [System.Media.SystemSounds]::Hand.Play() },
  { [System.Media.SystemSounds]::Question.Play() },
  { [System.Media.SystemSounds]::Beep.Play() }
)
while ((Get-Date) -lt $end) {
  try { & $players[(Get-Random -Minimum 0 -Maximum $players.Count)] } catch { }
  Start-Sleep -Milliseconds (Get-Random -Minimum 280 -Maximum 900)
}
