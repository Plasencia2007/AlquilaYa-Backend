<#
.SYNOPSIS
  Smoke test end-to-end (T4) contra el stack AlquilaYa YA levantado.

.DESCRIPTION
  Verifica que las piezas criticas responden a traves del API Gateway (:8080):
    1) Salud del gateway            GET  /actuator/health            -> status: UP
    2) Busqueda publica de cuartos  GET  /api/v1/propiedades/buscar  -> 200 + array JSON
    3) Login de administrador       POST /api/v1/usuarios/auth/login-admin -> 200 + token + rol ADMIN

  Sale con codigo != 0 si CUALQUIER verificacion falla (apto para CI / pre-deploy).

.PARAMETER BaseUrl
  URL base del gateway. Default: http://localhost:8080 (o $env:SMOKE_BASE_URL).

.PARAMETER AdminEmail / AdminPassword
  Credenciales del admin sembrado en dev (SeedDataInitializer): admin@gmail.com / Jhons2007@.
  Override con $env:SMOKE_ADMIN_EMAIL / $env:SMOKE_ADMIN_PASSWORD o parametros.

.EXAMPLE
  ./scripts/smoke-test.ps1
.EXAMPLE
  ./scripts/smoke-test.ps1 -BaseUrl https://alquilaya.midominio.com -AdminEmail admin@x.com -AdminPassword '****'
.EXAMPLE
  $env:SMOKE_ADMIN_PASSWORD='****'; ./scripts/smoke-test.ps1
#>
[CmdletBinding()]
param(
    [string]$BaseUrl       = $env:SMOKE_BASE_URL,
    [string]$AdminEmail    = $env:SMOKE_ADMIN_EMAIL,
    [string]$AdminPassword = $env:SMOKE_ADMIN_PASSWORD,
    [int]$TimeoutSec       = 15
)

if ([string]::IsNullOrWhiteSpace($BaseUrl))       { $BaseUrl = "http://localhost:8080" }
if ([string]::IsNullOrWhiteSpace($AdminEmail))    { $AdminEmail = "admin@gmail.com" }
if ([string]::IsNullOrWhiteSpace($AdminPassword)) { $AdminPassword = "Jhons2007@" }
$BaseUrl = $BaseUrl.TrimEnd('/')

$script:failures = 0
function Pass([string]$m) { Write-Host ("  [PASS] " + $m) -ForegroundColor Green }
function Fail([string]$m) { Write-Host ("  [FAIL] " + $m) -ForegroundColor Red; $script:failures++ }

Write-Host "== AlquilaYa smoke test ==" -ForegroundColor Cyan
Write-Host ("Gateway: {0}" -f $BaseUrl)

# --- 1) Salud del gateway -------------------------------------------------------
Write-Host "`n[1/3] Gateway health"
try {
    $health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/actuator/health" -TimeoutSec $TimeoutSec
    if ($health.status -eq "UP") { Pass "actuator/health -> UP" }
    else { Fail ("actuator/health -> status='{0}' (se esperaba UP)" -f $health.status) }
} catch {
    Fail ("no se pudo consultar /actuator/health: {0}" -f $_.Exception.Message)
}

# --- 2) Busqueda publica de propiedades ----------------------------------------
Write-Host "`n[2/3] Public property search"
try {
    $resp = Invoke-WebRequest -Method Get -Uri "$BaseUrl/api/v1/propiedades/buscar" -TimeoutSec $TimeoutSec -UseBasicParsing
    if ($resp.StatusCode -ne 200) {
        Fail ("/api/v1/propiedades/buscar -> HTTP {0}" -f $resp.StatusCode)
    } else {
        $data = $resp.Content | ConvertFrom-Json
        # Un array JSON (aunque este vacio) es una respuesta sana.
        if ($data -is [System.Array] -or $data -eq $null -or $resp.Content.TrimStart().StartsWith("[")) {
            $count = 0
            if ($data -is [System.Array]) { $count = $data.Count } elseif ($data) { $count = 1 }
            Pass ("/api/v1/propiedades/buscar -> HTTP 200, {0} propiedad(es)" -f $count)
        } else {
            Fail "/api/v1/propiedades/buscar -> 200 pero el cuerpo no es un array JSON"
        }
    }
} catch {
    Fail ("no se pudo consultar /api/v1/propiedades/buscar: {0}" -f $_.Exception.Message)
}

# --- 3) Login de administrador --------------------------------------------------
Write-Host "`n[3/3] Admin login"
try {
    $body = @{ correo = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/usuarios/auth/login-admin" `
        -ContentType "application/json" -Body $body -TimeoutSec $TimeoutSec
    # S5: el JWT ya no viaja en el body (vive en una cookie httpOnly) — el login exitoso se
    # confirma con autenticado=true + rol ADMIN.
    if ($login.autenticado -eq $true -and $login.rol -eq "ADMIN") {
        Pass ("login-admin -> autenticado OK, rol={0}" -f $login.rol)
    } else {
        Fail ("login-admin -> respuesta sin autenticado=true o rol!=ADMIN (rol='{0}')" -f $login.rol)
    }
} catch {
    Fail ("login-admin fallo: {0}" -f $_.Exception.Message)
    Write-Host "         (revisa credenciales SMOKE_ADMIN_EMAIL/PASSWORD o que exista el admin sembrado)" -ForegroundColor DarkGray
}

# --- Resultado ------------------------------------------------------------------
Write-Host ""
if ($script:failures -eq 0) {
    Write-Host "SMOKE TEST OK: todas las verificaciones pasaron." -ForegroundColor Green
    exit 0
} else {
    Write-Host ("SMOKE TEST FALLIDO: {0} verificacion(es) fallaron." -f $script:failures) -ForegroundColor Red
    exit 1
}
