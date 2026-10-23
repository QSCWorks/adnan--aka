Set sh = CreateObject("Wscript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
ps = sh.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
tray = dir & "\lisans-tray.ps1"
sh.Run """" & ps & """ -NoProfile -ExecutionPolicy Bypass -Sta -WindowStyle Hidden -File """ & tray & """", 0, False
