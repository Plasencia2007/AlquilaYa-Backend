#!/usr/bin/env bash
# =============================================================================
# smoke-test.sh - Smoke test end-to-end (T4) contra el stack AlquilaYa levantado.
#
# Verifica que las piezas criticas responden a traves del API Gateway (:8080):
#   1) Salud del gateway            GET  /actuator/health             -> "status":"UP"
#   2) Busqueda publica de cuartos  GET  /api/v1/propiedades/buscar   -> 200 + array JSON
#   3) Login de administrador       POST /api/v1/usuarios/auth/login-admin -> 200 + autenticado=true + rol ADMIN
#
# Sale con codigo != 0 si CUALQUIER verificacion falla (apto para CI / pre-deploy).
#
# Uso:
#   ./scripts/smoke-test.sh
#   SMOKE_BASE_URL=https://alquilaya.midominio.com ./scripts/smoke-test.sh
#   SMOKE_ADMIN_EMAIL=admin@x.com SMOKE_ADMIN_PASSWORD='****' ./scripts/smoke-test.sh
#
# Solo requiere `curl` (no necesita jq).
# =============================================================================
set -u

BASE_URL="${SMOKE_BASE_URL:-http://localhost:8080}"
BASE_URL="${BASE_URL%/}"
ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-admin@gmail.com}"
ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD:-Jhons2007@}"
TIMEOUT="${SMOKE_TIMEOUT:-15}"

failures=0
pass() { printf '  [PASS] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1"; failures=$((failures + 1)); }

echo "== AlquilaYa smoke test =="
echo "Gateway: ${BASE_URL}"

# --- 1) Salud del gateway ----------------------------------------------------
echo ""
echo "[1/3] Gateway health"
health_body="$(curl -s --max-time "$TIMEOUT" "${BASE_URL}/actuator/health" || true)"
if printf '%s' "$health_body" | grep -q '"status":"UP"'; then
    pass "actuator/health -> UP"
else
    fail "actuator/health no devolvio status UP (respuesta: ${health_body:-<vacia>})"
fi

# --- 2) Busqueda publica de propiedades --------------------------------------
echo ""
echo "[2/3] Public property search"
search_code="$(curl -s -o /tmp/smoke_buscar.json -w '%{http_code}' --max-time "$TIMEOUT" \
    "${BASE_URL}/api/v1/propiedades/buscar" || true)"
if [ "$search_code" = "200" ] && head -c 1 /tmp/smoke_buscar.json 2>/dev/null | grep -q '\['; then
    pass "/api/v1/propiedades/buscar -> HTTP 200 + array JSON"
else
    fail "/api/v1/propiedades/buscar -> HTTP ${search_code} (se esperaba 200 + array JSON)"
fi

# --- 3) Login de administrador ----------------------------------------------
echo ""
echo "[3/3] Admin login"
login_body="$(curl -s --max-time "$TIMEOUT" \
    -H 'Content-Type: application/json' \
    -d "{\"correo\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    "${BASE_URL}/api/v1/usuarios/auth/login-admin" || true)"
# S5: el JWT ya no viaja en el body (vive en una cookie httpOnly) — el login exitoso se
# confirma con "autenticado":true + rol ADMIN.
if printf '%s' "$login_body" | grep -q '"autenticado":true' && printf '%s' "$login_body" | grep -q '"rol":"ADMIN"'; then
    pass "login-admin -> autenticado OK, rol ADMIN"
else
    fail "login-admin sin autenticado=true/rol ADMIN (revisa SMOKE_ADMIN_EMAIL/PASSWORD o el admin sembrado)"
fi

# --- Resultado ---------------------------------------------------------------
echo ""
if [ "$failures" -eq 0 ]; then
    echo "SMOKE TEST OK: todas las verificaciones pasaron."
    exit 0
else
    echo "SMOKE TEST FALLIDO: ${failures} verificacion(es) fallaron."
    exit 1
fi
