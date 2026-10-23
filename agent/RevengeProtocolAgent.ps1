# Revenge Protocol — Windows arka plan aracı (PowerShell)
$ErrorActionPreference = 'SilentlyContinue'

function Get-ConfigPath {
  if ($env:REVENGE_CONFIG) { return $env:REVENGE_CONFIG }
  return Join-Path $env:ProgramData 'QSteelCAD\RevengeProtocol\config.json'
}

function Load-Config {
  if ($env:REVENGE_API_URL) {
    return @{
      apiUrl      = $env:REVENGE_API_URL.TrimEnd('/')
      agentId     = $(if ($env:REVENGE_AGENT_ID) { $env:REVENGE_AGENT_ID } else { 'dev-agent' })
      secret      = $(if ($env:REVENGE_AGENT_SECRET) { $env:REVENGE_AGENT_SECRET } else { 'dev-secret-change-me-32chars!!' })
      registerKey = $null
    }
  }
  $path = Get-ConfigPath
  if (-not (Test-Path -LiteralPath $path)) { throw "config yok: $path" }
  $raw = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  return @{
    apiUrl      = [string]$raw.apiUrl
    agentId     = [string]$raw.agentId
    secret      = [string]$raw.secret
    registerKey = [string]$raw.registerKey
  }
}

function Save-Config($cfg) {
  $path = Get-ConfigPath
  $dir = Split-Path -Parent $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $obj = [ordered]@{
    apiUrl  = $cfg.apiUrl
    agentId = $cfg.agentId
    secret  = $cfg.secret
  }
  ($obj | ConvertTo-Json) | Set-Content -LiteralPath $path -Encoding UTF8
}

function Register-Agent($cfg) {
  $body = @{
    agentId     = $cfg.agentId
    secret      = $cfg.secret
    hostname    = $env:COMPUTERNAME
    registerKey = $cfg.registerKey
  } | ConvertTo-Json
  Invoke-RestMethod -Method POST -Uri ($cfg.apiUrl + '/api/agent/register') -ContentType 'application/json' -Body $body | Out-Null
}

function Send-Heartbeat($cfg) {
  $body = @{
    agentId  = $cfg.agentId
    secret   = $cfg.secret
    hostname = $env:COMPUTERNAME
  } | ConvertTo-Json
  return Invoke-RestMethod -Method POST -Uri ($cfg.apiUrl + '/api/agent/heartbeat') -ContentType 'application/json' -Body $body
}

function Open-Kiosk([string]$Url) {
  $edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
  if (Test-Path -LiteralPath $edge) {
    Start-Process -FilePath $edge -ArgumentList @('--kiosk', $Url, '--edge-kiosk-type=fullscreen')
    return
  }
  Start-Process $Url
}

function Invoke-Shutdown([bool]$Restart) {
  if ($Restart) {
    shutdown.exe /r /t 0 /f
  } else {
    shutdown.exe /s /t 0 /f
  }
}

function Invoke-CommandPayload($cmd) {
  if (-not $cmd) { return }
  switch ($cmd.kind) {
    'scenario' { if ($cmd.url) { Open-Kiosk $cmd.url } }
    'shutdown' { Invoke-Shutdown $false }
    'restart'  { Invoke-Shutdown $true }
  }
}

$cfg = Load-Config
if ($cfg.registerKey -and $cfg.registerKey.Length -gt 3) {
  try {
    Register-Agent $cfg
    Save-Config $cfg
  } catch {
    # sonraki turda tekrar dener
  }
}

while ($true) {
  try {
    $resp = Send-Heartbeat $cfg
    Invoke-CommandPayload $resp.command
  } catch {
    # ag kesintisi
  }
  Start-Sleep -Seconds 8
}
