param(
  [string]$Message = '',
  [string]$MessageFile = '',
  [int]$DurationSec = 12
)
$ErrorActionPreference = 'SilentlyContinue'
$sec = [Math]::Min(120, [Math]::Max(3, $DurationSec))
$text = $Message
if ($MessageFile -and (Test-Path -LiteralPath $MessageFile)) {
  $text = [System.IO.File]::ReadAllText($MessageFile, [System.Text.Encoding]::UTF8)
}
$text = ($text -replace '\r\n', "`n" -replace '\r', "`n").Trim()
if (-not $text) { $text = '20.10 UNUTULMADI.' }

if (-not ('Rp.TopMsg' -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
namespace Rp {
  public static class TopMsg {
    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "MessageBoxTimeoutW")]
    public static extern int Timeout(IntPtr hWnd, string text, string caption, uint type, ushort lang, uint ms);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "MessageBoxW")]
    public static extern int Show(IntPtr hWnd, string text, string caption, uint type);
  }
}
"@
}

# Uyarı + her zaman üstte + öne getir + sistem modal
$flags = [uint32](0x30 -bor 0x40000 -bor 0x10000 -bor 0x1000)
try {
  [void][Rp.TopMsg]::Timeout([IntPtr]::Zero, $text, 'Windows Güvenliği', $flags, 0, [uint32]($sec * 1000))
} catch {
  [void][Rp.TopMsg]::Show([IntPtr]::Zero, $text, 'Windows Güvenliği', $flags)
}
