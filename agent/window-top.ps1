# Görünür pencereleri en üste alır (HWND_TOPMOST + öne getir).
if (-not ('Rp.NativeTop' -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
namespace Rp {
  public static class NativeTop {
    public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr extra);
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public static IntPtr[] VisibleWindows() {
      var list = new List<IntPtr>();
      EnumProc cb = (h, l) => { if (IsWindowVisible(h)) list.Add(h); return true; };
      EnumWindows(cb, IntPtr.Zero);
      GC.KeepAlive(cb);
      return list.ToArray();
    }
    public static void Raise(IntPtr h) {
      if (h == IntPtr.Zero) return;
      ShowWindow(h, 5);
      keybd_event(0x12, 0, 0, UIntPtr.Zero);
      SetWindowPos(h, HWND_TOPMOST, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0040);
      BringWindowToTop(h);
      SetForegroundWindow(h);
      keybd_event(0x12, 0, 2, UIntPtr.Zero);
    }
  }
}
"@
}

function Get-RpPids {
  param([int]$RootPid = 0, [string]$ProcessName = '', [string]$CommandLike = '')
  $set = New-Object 'System.Collections.Generic.HashSet[int]'
  if ($RootPid -gt 0) { [void]$set.Add($RootPid) }
  $procs = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
  foreach ($p in $procs) {
    $name = [string]$p.Name
    $matchName = $ProcessName -and ($name -eq $ProcessName -or $name -eq ($ProcessName.TrimEnd('.exe') + '.exe'))
    if ($matchName) {
      if (-not $CommandLike -or ([string]$p.CommandLine -like "*$CommandLike*")) {
        [void]$set.Add([int]$p.ProcessId)
      }
    }
    if ($RootPid -gt 0 -and [int]$p.ParentProcessId -eq $RootPid) {
      [void]$set.Add([int]$p.ProcessId)
    }
  }
  return @($set)
}

function Invoke-RpRaisePids {
  param([int[]]$Pids)
  if (-not $Pids -or $Pids.Count -eq 0) { return }
  $want = @{}
  foreach ($id in $Pids) { if ($id -gt 0) { $want[$id] = $true } }
  foreach ($h in [Rp.NativeTop]::VisibleWindows()) {
    $procId = [uint32]0
    [void][Rp.NativeTop]::GetWindowThreadProcessId($h, [ref]$procId)
    if ($want.ContainsKey([int]$procId)) {
      [Rp.NativeTop]::Raise($h)
    }
  }
}
