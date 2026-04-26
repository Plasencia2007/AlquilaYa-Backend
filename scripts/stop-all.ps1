#Requires -Version 5.1
<#
.SYNOPSIS
Detiene todos los procesos de AlquilaYa (Java, Node, frontend) lanzados por start-all.ps1.

.DESCRIPTION
Mata por puerto (discovery, config, gateway, servicios con puerto fijo, Node, Next).
Como servicio-usuarios usa puerto aleatorio, lo busca por línea de comando del java.exe.
Las ventanas cmd se cerrarán cuando termine su proceso hijo.

.PARAMETER KeepInfra
No toca postgres/mysql/kafka/ngrok. Por default los deja arriba (son Docker, no consumen
mucho y acelerar el próximo arranque). Pasar -IncludeInfra si quieres bajarlos también.

.PARAMETER IncludeInfra
Además de los servicios, baja la infra con "docker compose down".

.EXAMPLE
PS> .\scripts\stop-all.ps1
# Detiene servicios; deja postgres/kafka arriba para el próximo start.

.EXAMPLE
PS> .\scripts\stop-all.ps1 -IncludeInfra
# Detiene TODO, incluyendo contenedores Docker.
#>

[CmdletBinding()]
param(
    [switch]$IncludeInfra
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot

function Stop-ByPort {
    param([int]$Port, [string]$Label)
    $conexiones = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conexiones) { return }
    foreach ($c in $conexiones) {
        try {
            $proc = Get-Process -Id $c.OwningProcess -ErrorAction Stop
            Write-Host "  Matando :$Port ($Label) -> $($proc.ProcessName) PID $($proc.Id)" -ForegroundColor DarkYellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        } catch {
            # proc ya no existe
        }
    }
}

Write-Host ""
Write-Host "Deteniendo servicios de AlquilaYa..." -ForegroundColor Yellow

# Puertos fijos
Stop-ByPort 8761 "discovery-server"
Stop-ByPort 8888 "config-server"
Stop-ByPort 8080 "api-gateway"
Stop-ByPort 8082 "servicio-propiedades"
Stop-ByPort 8084 "servicio-pagos"
Stop-ByPort 8085 "servicio-catalogos"
Stop-ByPort 8086 "servicio-mensajeria"
Stop-ByPort 8081 "servicio-notificaciones"
Stop-ByPort 3000 "frontend Next.js"

# servicio-usuarios usa puerto aleatorio (server.port=0).
# Lo detectamos buscando java.exe con commandline que referencie el módulo.
$javas = Get-CimInstance Win32_Process -Filter "Name = 'java.exe'" -ErrorAction SilentlyContinue
if ($javas) {
    $javas | Where-Object {
        $_.CommandLine -and $_.CommandLine -match 'servicio-usuarios'
    } | ForEach-Object {
        Write-Host "  Matando java (servicio-usuarios) PID $($_.ProcessId)" -ForegroundColor DarkYellow
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

# Infra Docker (opcional)
if ($IncludeInfra) {
    Write-Host ""
    Write-Host "Bajando infra Docker..." -ForegroundColor Yellow
    Push-Location $root
    try {
        docker compose down 2>&1 | Out-Host
    } finally {
        Pop-Location
    }
} else {
    Write-Host ""
    Write-Host "Infra Docker INTACTA (postgres/mysql/kafka siguen up)." -ForegroundColor DarkGray
    Write-Host "Para bajarla: .\scripts\stop-all.ps1 -IncludeInfra" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Listo. Las ventanas cmd se cerraran al terminar sus procesos." -ForegroundColor Green
Write-Host ""
