#Requires -Version 5.1
<#
.SYNOPSIS
Arranca todos los servicios de AlquilaYa en ventanas separadas de cmd.

.DESCRIPTION
1) Verifica que la infra (postgres, mysql, kafka) esté arriba con docker compose.
2) Arranca discovery-server y espera.
3) Arranca config-server y espera.
4) Arranca en paralelo: api-gateway, servicio-usuarios, servicio-propiedades,
   servicio-pagos, servicio-catalogos, servicio-mensajeria.
5) Arranca servicio-notificaciones (Node) y el frontend Next.js.

Cada servicio corre en su propia ventana cmd con título descriptivo; los logs
son visibles en cada una.

.PARAMETER SkipDocker
No verifica ni arranca postgres/mysql/kafka vía docker compose.

.PARAMETER NoNgrok
No levanta ngrok (ahorra esperar el túnel si no vas a probar webhook MP).

.PARAMETER NoNotifications
No arranca servicio-notificaciones (Node).

.PARAMETER NoFrontend
No arranca el frontend Next.js.

.PARAMETER Minimal
Atajo: equivale a -NoNotifications -NoFrontend -NoNgrok. Solo los servicios Java.

.EXAMPLE
PS> .\scripts\start-all.ps1
# Arranca todo.

.EXAMPLE
PS> .\scripts\start-all.ps1 -Minimal
# Solo los servicios Java y la infra (sin notificaciones, sin frontend, sin ngrok).

.EXAMPLE
PS> .\scripts\start-all.ps1 -SkipDocker
# Asume que la infra ya está arriba (útil en re-arranques rápidos).
#>

[CmdletBinding()]
param(
    [switch]$SkipDocker,
    [switch]$NoNgrok,
    [switch]$NoNotifications,
    [switch]$NoFrontend,
    [switch]$Minimal
)

# Nota: usamos 'Continue' porque 'Stop' convierte cualquier stderr de comandos nativos
# (docker, mvnw, etc.) en excepcion terminal con un stack trace feo. Chequeamos
# $LASTEXITCODE manualmente donde importa.
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot

if ($Minimal) {
    $NoNotifications = $true
    $NoFrontend = $true
    $NoNgrok = $true
}

# Detectar Windows Terminal. Si está instalado usamos tabs en una sola ventana.
$script:WtAvailable = $null -ne (Get-Command wt.exe -ErrorAction SilentlyContinue)
$script:WtWindowId = "AlquilaYa"

function Start-ServiceWindow {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string]$WorkingDir,
        [Parameter(Mandatory = $true)][string]$Command
    )
    $fullDir = Join-Path $root $WorkingDir
    if (-not (Test-Path $fullDir)) {
        Write-Warning "Directorio no existe: $fullDir (se omite)"
        return
    }
    Write-Host "  -> $Title  ($WorkingDir)" -ForegroundColor Cyan

    if ($script:WtAvailable) {
        # Windows Terminal: una ventana con identificador fijo + una tab por servicio.
        # -w AlquilaYa = usa/crea la ventana con ese nombre.
        # nt = new-tab. cmd /k mantiene la tab abierta.
        Start-Process -FilePath "wt.exe" -ArgumentList @(
            "-w", $script:WtWindowId,
            "nt",
            "--title", $Title,
            "-d", $fullDir,
            "cmd.exe", "/k", $Command
        ) -WindowStyle Hidden | Out-Null
    } else {
        # Fallback: ventana cmd separada por servicio.
        Start-Process -FilePath "cmd.exe" `
            -ArgumentList "/k", "title $Title && $Command" `
            -WorkingDirectory $fullDir | Out-Null
    }
}

function Wait-Seconds {
    param([int]$Seconds, [string]$Message)
    Write-Host "  ... esperando ${Seconds}s: $Message" -ForegroundColor DarkGray
    Start-Sleep -Seconds $Seconds
}

# ---------------------------------------------------------------------------
# Carga el .env de la raiz en el entorno del proceso PowerShell actual.
# Las ventanas cmd abiertas por Start-Process heredan estas env vars, por lo
# que Maven ve POSTGRES_PASSWORD, JWT_SECRET, etc. al arrancar los servicios.
# Sin esto, los YAML resuelven ${POSTGRES_PASSWORD:PLACEHOLDER_SET_ENV_VAR}
# al placeholder y Postgres rechaza la conexion.
# ---------------------------------------------------------------------------
function Import-DotEnv {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path $Path)) {
        Write-Host "  AVISO: $Path no existe. Los YAML usaran sus defaults." -ForegroundColor DarkYellow
        return 0
    }
    $count = 0
    foreach ($raw in (Get-Content -LiteralPath $Path)) {
        $line = $raw.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { continue }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { continue }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or
            ($val.StartsWith("'") -and $val.EndsWith("'"))) {
            if ($val.Length -ge 2) {
                $val = $val.Substring(1, $val.Length - 2)
            }
        }
        [Environment]::SetEnvironmentVariable($key, $val, 'Process')
        $count++
    }
    return $count
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " AlquilaYa - arranque de servicios" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

if ($script:WtAvailable) {
    Write-Host "  Modo: Windows Terminal (una ventana con tabs)" -ForegroundColor DarkGray
} else {
    Write-Host "  Modo: cmd separados (una ventana por servicio)" -ForegroundColor DarkGray
    Write-Host "  Instala Windows Terminal desde Microsoft Store para" -ForegroundColor DarkGray
    Write-Host "  obtener tabs en una sola ventana: https://aka.ms/terminal" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 0. Cargar .env y validar variables criticas
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[0/4] Cargando .env" -ForegroundColor Yellow
$envFile = Join-Path $root '.env'
$loaded = Import-DotEnv $envFile
Write-Host "  $loaded variables cargadas desde $envFile"

$missing = @()
foreach ($k in @('POSTGRES_PASSWORD','JWT_SECRET')) {
    $v = [Environment]::GetEnvironmentVariable($k, 'Process')
    if (-not $v -or $v -eq 'PLACEHOLDER_SET_ENV_VAR') { $missing += $k }
}
if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "  ERROR: Faltan variables criticas en .env: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "  Copia .env.example a .env y completa los valores." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# ---------------------------------------------------------------------------
# 1. Infra Docker (postgres, mysql, kafka, [ngrok])
# ---------------------------------------------------------------------------
if (-not $SkipDocker) {
    Write-Host ""
    Write-Host "[1/4] Infra (docker compose)" -ForegroundColor Yellow

    # Verificar que Docker Desktop responde antes de intentar compose.
    & docker info *>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  ERROR: Docker Desktop no esta corriendo." -ForegroundColor Red
        Write-Host ""
        Write-Host "  Que hacer:" -ForegroundColor Yellow
        Write-Host "    1. Abre Docker Desktop desde el menu Inicio." -ForegroundColor White
        Write-Host "    2. Espera 30-60s a que el icono de la ballena este estable." -ForegroundColor White
        Write-Host "    3. Vuelve a ejecutar: .\scripts\start-all.cmd" -ForegroundColor White
        Write-Host ""
        Write-Host "  Si la infra ya esta arriba por otro medio, usa:" -ForegroundColor DarkGray
        Write-Host "    .\scripts\start-all.cmd -SkipDocker" -ForegroundColor DarkGray
        Write-Host ""
        exit 1
    }

    $infra = @('postgres', 'mysql', 'zookeeper', 'kafka')
    if (-not $NoNgrok) { $infra += 'ngrok' }

    Push-Location $root
    try {
        & docker compose up -d @infra 2>&1 | Out-Host
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "  ERROR: 'docker compose up' fallo (exit $LASTEXITCODE)." -ForegroundColor Red
            Write-Host "  Revisa el log de arriba. Abortando." -ForegroundColor Red
            Write-Host ""
            exit 1
        }
    } finally {
        Pop-Location
    }
    Wait-Seconds 8 "que Postgres/MySQL/Kafka acepten conexiones"
} else {
    Write-Host ""
    Write-Host "[1/4] Infra Docker SALTADA (-SkipDocker)" -ForegroundColor DarkYellow
}

# ---------------------------------------------------------------------------
# 2. Discovery + Config (secuencial; el resto depende de ambos)
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Discovery + Config server" -ForegroundColor Yellow
Start-ServiceWindow "01-discovery-8761" "discovery-server" "mvnw.cmd spring-boot:run"
Wait-Seconds 20 "al discovery-server (Eureka)"

Start-ServiceWindow "02-config-8888" "config-server" "mvnw.cmd spring-boot:run"
Wait-Seconds 15 "al config-server"

# ---------------------------------------------------------------------------
# 3. Gateway + microservicios de dominio (paralelo)
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/4] Gateway + microservicios de dominio" -ForegroundColor Yellow
Start-ServiceWindow "03-gateway-8080"     "api-gateway"          "mvnw.cmd spring-boot:run"
Start-ServiceWindow "04-usuarios"         "servicio-usuarios"    "mvnw.cmd spring-boot:run"
Start-ServiceWindow "05-propiedades-8082" "servicio-propiedades" "mvnw.cmd spring-boot:run"
Start-ServiceWindow "06-pagos-8084"       "servicio-pagos"       "mvnw.cmd spring-boot:run"
Start-ServiceWindow "07-catalogos-8085"   "servicio-catalogos"   "mvnw.cmd spring-boot:run"
Start-ServiceWindow "08-mensajeria-8086"  "servicio-mensajeria"  "mvnw.cmd spring-boot:run"

# ---------------------------------------------------------------------------
# 4. Extras: notificaciones (Node) + frontend (Next.js)
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/4] Extras" -ForegroundColor Yellow
if (-not $NoNotifications) {
    Start-ServiceWindow "09-notificaciones-8081" "servicio-notificaciones" "npm start"
} else {
    Write-Host "  (notificaciones SALTADO)" -ForegroundColor DarkYellow
}

if (-not $NoFrontend) {
    Start-ServiceWindow "10-frontend-3000" "AlquilaYa-Fronted" "npm run dev"
} else {
    Write-Host "  (frontend SALTADO)" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " Servicios lanzados" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Eureka:     http://localhost:8761" -ForegroundColor Cyan
Write-Host "Gateway:    http://localhost:8080" -ForegroundColor Cyan
Write-Host "Config:     http://localhost:8888" -ForegroundColor Cyan
Write-Host "Frontend:   http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Detener todo:  .\scripts\stop-all.ps1" -ForegroundColor DarkGray
Write-Host ""
