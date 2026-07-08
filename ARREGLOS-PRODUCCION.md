# 🛠️ AlquilaYa — Plan de arreglos para producción

> Checklist vivo de la revisión completa del proyecto (backend + frontend + infra).
> **Marca `[x]` cada tarea a medida que se completa.** Todo es importante; el orden es solo prioridad de ataque.

**Leyenda:** 🔴 Bloqueante (impide desplegar / pierde dinero-datos) · 🟠 Alto (seguridad/riesgo real) · 🟡 Importante · 🔵 Para brillar (producto/diseño)

---

## 📊 Progreso

| Bloque | Total | Hechas |
|--------|-------|--------|
| 🔴 Bloqueantes de arranque/dinero | 4 | 4 (+ 2 pasos manuales de B4) |
| 🟠 Seguridad alta | 8 | 4 |
| 🟡 Pagos / Reservas | 5 | 4 |
| 🟡 Usuarios / Auth | 7 | 3 |
| 🟡 Infra / Kafka / Observabilidad | 8 | 6 |
| 🟡 Frontend | 6 | 3 |
| 🟡 Tests | 4 | 0 |
| 🔵 Para que brille (producto) | 8 | 0 |
| 🔵 Para que brille (diseño) | 4 | 0 |
| **TOTAL** | **54** | **24** (+ 3 sub-items de S8) |

---

## 🔴 BLOQUEANTES — sin esto, no se lanza

- [x] **B1 · El esquema no se crea en una BD nueva.** ✅ RESUELTO y VERIFICADO con el motor real de Flyway
  - ✅ `V1__baseline_schema.sql` generado del esquema REAL (pg_dump/mysqldump) para los 5 servicios: **usuarios, propiedades, pagos, catalogos, mensajería**. (pagos y catalogos también estaban desfasados: a pagos le faltaban 4 columnas, a catalogos 2 tablas de multi-universidad → se consolidaron.)
  - ✅ usuarios conserva V2–V7 (idempotentes; V4 siembra `configuracion_auth`). Migraciones viejas/desfasadas movidas a `db/legacy/` (fuera del scan de Flyway, conservadas). V_manual (nombre inválido para Flyway) reubicado.
  - ✅ `FLYWAY_ENABLED=true` en `docker-compose.prod.yml` (config-server), con `ddl-auto=validate`.
  - ✅ **Probado con Flyway real contra BD frescas**: usuarios 7 migraciones, propiedades/pagos/mensajería/catalogos 1 cada uno → todas ✅. (Bug encontrado y corregido: pg_dump metía meta-comandos `\restrict` que rompían el parser de Flyway.)
  - ⏳ Confirmación final: primer deploy a prod (o `start-all.ps1` con `FLYWAY_ENABLED=true`).
- [x] **B2 · Cualquiera crea una cuenta ADMIN sin autenticarse.** ✅ RESUELTO
  - ✅ Quitado `ADMIN` del regex de `RegisterRequest` (ahora solo `ESTUDIANTE|ARRENDADOR`).
  - ✅ Guardia defensiva en `registrarUsuario`: rechaza `ADMIN` y ya no lo crea ACTIVE/verificado.
  - ✅ `register-admin` protegido con `@PreAuthorize("hasRole('ADMIN')")` (solo un ADMIN crea otro; el primero por semilla).
  - ✅ `servicio-usuarios` compila. Archivos: `RegisterRequest.java`, `UsuarioService.java`, `AuthController.java`
- [x] **B3 · Los reembolsos nunca se ejecutan.** ✅ RESUELTO
  - ✅ Nuevo `RefundEventListener` (servicio-pagos) consume `pagos-topic` con grupo propio `pagos-refund-group`, filtra `REFUND_REQUERIDO` (ignora PAGO_EXITOSO/FALLIDO), DLQ ante error inesperado.
  - ✅ Nuevo `RefundService`: reembolsa TODOS los pagos `PAGADO` de la reserva vía `PaymentRefundClient` de MercadoPago (reembolso total; cubre pagos grupales), los marca `REEMBOLSADO` y emite `REFUND_COMPLETADO`.
  - ✅ Idempotente (solo PAGADO → REEMBOLSADO; re-entrega = no-op). Rechazo de MP → `REEMBOLSO_FALLIDO` + evento `REFUND_FALLIDO` para reconciliación (no rompe la partición).
  - ✅ `servicio-pagos` compila. Archivos: `kafka/RefundEventListener.java`, `services/RefundService.java`.
  - ⏳ Falta prueba end-to-end (necesita Kafka + MP sandbox arriba).
- [~] **B4 · Secretos productivos reales commiteados en git** — código/config RESUELTO; faltan 2 pasos manuales.
  - ✅ Reemplazados **todos** los defaults de secretos por `PLACEHOLDER_SET_ENV_VAR` en los 5 config YAML (JWT, POSTGRES/MYSQL password, MP access-token, Cloudinary api-secret, SMTP password, INTERNAL_API_KEY). Dev sigue funcionando porque `start-all.ps1` carga el `.env` real y sobrescribe.
  - ✅ `.env.example`: password de BD reales → placeholders.
  - ✅ Verificado con grep: **0 secretos reales** en archivos versionados.
  - ⚠️ **MANUAL PENDIENTE (solo tú):** ROTAR todas las credenciales en sus paneles (MercadoPago, Cloudinary, Gmail app-password, generar nuevo JWT_SECRET e INTERNAL_API_KEY) — siguen expuestas en el **historial de git**.
  - ⚠️ **MANUAL PENDIENTE (solo tú):** PURGAR el historial de git (`git filter-repo` / BFG) para borrar los secretos de commits pasados.

---

## 🟠 SEGURIDAD ALTA

- [x] **S1 · IDOR: leer documentos de identidad (DNI) de otros.** ✅ `GET /usuarios/documentos/usuario/{usuarioId}` ahora exige `@permisoEnforcer.esPropioUsuario(#usuarioId)` o permiso `VER_USUARIOS`. `DocumentoController.java`
- [x] **S2 · IDOR: subir documentos a la cuenta de otro.** ✅ `POST /documentos/upload` ahora exige `esPropioUsuario(#usuarioId)` (solo tu cuenta). `DocumentoController.java`
- [x] **S3 · IDOR: escribir el DNI de otro y auto-aprobar su verificación.** ✅ `POST /documentos/verificar-dni-instantaneo` ahora exige `esPropioUsuario(#usuarioId)`. `DocumentoController.java`
- [x] **S4 · IDOR: borrar/editar reservas ajenas.** ✅ `PUT`/`DELETE /reservas/{id}` ahora validan dueño vía nuevo `validarGestorReserva` (arrendador dueño o admin); antes solo checaban permiso. `ReservaController.java`, `ReservaService.java`. Ambos servicios compilan.
- [ ] **S5 · JWT del frontend en cookie no-httpOnly (XSS).** Movido a cookie `httpOnly` + `secure` + `sameSite` puesta por el backend; quitar js-cookie. `AlquilaYa-Fronted/src/services/auth-service.ts:28,75,113`
- [ ] **S6 · Sin TLS.** nginx publica 443 pero solo tiene `listen 80`. Agregar bloque `listen 443 ssl` + certificados (Let's Encrypt). `nginx/nginx.conf:17`, `docker-compose.prod.yml:364-369`
- [ ] **S7 · Webhook MP sin validación de firma en la config activa** (`MP_WEBHOOK_REQUIRED_SIGNATURE=false`). Activar la verificación HMAC (ya implementada) como primera línea de defensa. `.env:42-43`, `servicio-pagos.yml:150-166`
- [ ] **S8 · Endurecer superficie de auth:** (parcial)
  - [x] ✅ Endpoint dev `simular-exito`: se agregó `SPRING_PROFILES_ACTIVE=prod` a servicio-pagos en `docker-compose.prod.yml` → el `DevOnlyPagoController` (`@Profile("!prod")`) queda excluido en prod.
  - Rate limiting evadible con `X-Forwarded-For` falsificado (fuerza bruta OTP/login). `RateLimitFilter.java:95-106`, `RateLimitGlobalFilter.java:211-222` — PENDIENTE
  - WebSocket ignora la revocación de token (sesión viva hasta 24h tras logout). `WebSocketAuthInterceptor.java:52-69` — PENDIENTE
  - [x] ✅ OTP endurecido a exactamente 6 dígitos (`/^\d{6}$/`; el código siempre se genera con `%06d`). `servicio-notificaciones/index.js`
  - [x] ✅ `login-admin` ahora tiene lockout (verificarBloqueo + registrarFallo/Exito, como `login`). `AuthController.java`. Compila.

---

## 🟡 PAGOS / RESERVAS

- [x] **P1 · Un fallo de Redis descarta cada webhook.** ✅ `adquirirLockRedis` ahora es tri-estado: `null`=Redis caído/erró → **se sigue procesando** con idempotencia por BD (antes se descartaba el webhook y se perdía el pago); `false`=duplicado real → ignora; `true`=lock adquirido. `PagoService.java`. Compila.
- [x] **P2 · Eventos del outbox varados para siempre** tras 5 fallos. ✅ Nuevo `recuperarVarados()` (cada 5 min) + `findVarados()` en pagos y propiedades: re-envía los eventos varados cuando Kafka vuelve y **alerta por ERROR**. Aditivo — el `drenar()` rápido (cada 2s) no se tocó. Seguro por idempotencia de consumidores. Ambos compilan.
- [x] **P3 · Pagar una reserva no aprobada** captura dinero sin cambiar estado ni reembolsar. ✅ `crearPreferencia` ahora exige `estado=APROBADA` (rechaza SOLICITADA/CANCELADA/etc. con 409 antes de generar el link). `PagoService.java`. Compila.
- [x] **P4 · Pago tardío sobre reserva cancelada** se descarta sin reembolso. ✅ La saga, aunque esté en estado terminal, ahora detecta un pago tardío con reserva CANCELADA/RECHAZADA/EXPIRADA y emite el refund (vía `aplicarLogicaDirecta`); idempotente por estado del pago. `SagaReservaPagoService.java`. Compila.
- [ ] **P5 · Búsqueda sin paginación ni ordenamiento** (`GET /buscar` devuelve un `List` plano). Agregar `Pageable` + `ORDER BY`. `PropiedadController.java:686-711`, `PropiedadRepository.java:85-115`

---

## 🟡 USUARIOS / AUTH

- [ ] **U1 · `/register` devuelve un JWT válido inmediato**, antes de verificar OTP/email → la verificación es opcional. Verificar `estado`/flags en el filtro de token o no emitir token usable. `AuthController.java:60-70`, `JwtAuthenticationFilter.java`
- [ ] **U2 · Sin `unique` en `telefono` ni `dni`** en BD → carrera en registro y `NonUniqueResultException` en verificación de OTP. Agregar constraints vía Flyway. `Usuario.java:31-32,49-50`
- [ ] **U3 · Flujo de aprobación del ARRENDADOR incompleto.** El recálculo de verificación solo aplica a estudiantes; el arrendador no tiene `verificado`, no se emiten eventos de aprobación/rechazo, publicar no está bloqueado por KYC, y los arrendadores de Google quedan sin perfil. `DocumentoService.java:100-101`, `Arrendador.java`, `GoogleAuthService.java:142-155`
- [ ] **U4 · Faltan estados REJECTED y SUSPENDED** en `EstadoUsuario` (solo PENDING/ACTIVE/BANNED). `EstadoUsuario.java`
- [x] **U5 · Cambiar contraseña/reset no revoca sesiones** y el token de reset era reutilizable. ✅ Nuevo `SesionService.revocarTodas()`; `reset` y `cambiarPassword` ahora revocan **todas** las sesiones (mata sesiones de un atacante). El token de reset es **de un solo uso** (se blacklistea tras usarlo; se rechaza si se reintenta). `PasswordResetService.java`, `UsuarioService.java`. Compila.
- [x] **U6 · Cambiar teléfono no limpia `telefonoVerificado`** → el badge "verificado" pasaba al número nuevo. ✅ Al cambiar el teléfono (perfil propio y admin), si el número **cambia** se pone `telefonoVerificado=false` (re-verificación por OTP). Si es el mismo, no toca el flag. `UsuarioController.java`, `UsuarioService.java`. Compila.
- [x] **U7 · Se serializa el hash de la contraseña** en `listarTodos()`/`obtenerPorId`. ✅ Añadido `@JsonIgnore` al campo `password` en `Usuario.java` (verificado: ningún endpoint recibe `Usuario` como body ni se cachea en Redis, así que no rompe login/registro).

---

## 🟡 INFRA / KAFKA / OBSERVABILIDAD

- [x] **I1 · Kafka sin volúmenes** (dev y prod) → se pierden topics/offsets al recrear. ✅ Agregados volúmenes persistentes a **zookeeper** (`zookeeper_data`+`zookeeper_log`) y **kafka** (`kafka_data`) en ambos compose. Validado con `docker compose config`. ⚠️ Toma efecto al recrear los contenedores (`docker compose up -d`); la primera recreación arranca con volumen vacío (igual que cualquier reinicio hoy), y de ahí en más persiste.
- [ ] **I2 · Consumidores Java sin DLQ** — mensaje envenenado se descarta en silencio. Agregar `DeadLetterPublishingRecoverer`/`@RetryableTopic` (paridad con Node). Revisar también que el factory custom de usuarios respete `enable-auto-commit:false`. `KafkaConsumerConfig.java:22-42`
- [~] **I3 · Prometheus expuesto pero inservible** — ✅ Dependencia `micrometer-registry-prometheus` agregada a los 6 servicios (usuarios, propiedades, pagos, catalogos, mensajeria, gateway) → `/actuator/prometheus` ya responde con métricas. Compila. ⏳ Falta (opcional) **desplegar los contenedores Prometheus + Grafana** para scrapear/graficar.
- [ ] **I4 · Sin centralización de logs ni alertas.** Agregar Loki/ELK + alertas básicas.
- [x] **I5 · Sin límites de memoria/CPU** en los contenedores → una fuga OOM-kill a los vecinos, y **peor**: las JVMs con `MaxRAMPercentage=75%` sin límite creían tener el 75% de TODO el host. ✅ Agregado `mem_limit` a los 9 servicios JVM/Node en `docker-compose.prod.yml` (usuarios/propiedades/pagos/mensajeria/notificaciones 1g; gateway/catalogos 768m; discovery/config 512m). BD/Kafka/Redis se dejaron sin cap a propósito (gestionan su memoria; limitarlas arriesga perf/OOM). Validado con `docker compose config`. ⏳ Ajustar valores a la RAM real del servidor cuando lo tengas (suma ≈7.5 GB solo estos 9 → recomendable host ≥16 GB, o baja los valores).
- [x] **I6 · WhatsApp re-escanea QR en cada reinicio** — la sesión se escribía en `/app/.wwebjs_auth` (CWD) pero el volumen se monta en `/home/app/.wwebjs_auth`. ✅ `LocalAuth({ dataPath: WWEBJS_DATA_PATH })` env-driven; en prod `WWEBJS_DATA_PATH=/home/app/.wwebjs_auth` (coincide con el volumen → sesión persiste). Dev sin la var → default de siempre. `node --check` + `compose config` OK.
- [x] **I7 · El consumidor Kafka de notificaciones y el `ready` de WhatsApp.** ✅ Arreglado el bug real: en cada reconexión de WhatsApp se creaba **otro** consumidor sin parar el anterior (fuga en el mismo grupo) → ahora arranca **una sola vez** y solo se marca activo tras un `start()` exitoso (si falla, el próximo `ready` reintenta). El "pile-up si nunca autentica" queda mitigado porque Kafka **retiene** los eventos hasta que WhatsApp vuelve (desacoplar del todo causaría fallos de envío durante el QR, así que no se hizo a propósito). `index.js`. `node --check` OK.
- [x] **I8 · Hashes bcrypt del seed son falsos** → el admin sembrado no puede loguear. ✅ RESUELTO mejor: se eliminó el `data.sql` roto (y `extra_permissions.sql` redundante) y se añadió **bootstrap del primer admin por env** en `DataInitializer` (`ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD`, hash en runtime, sin secretos en git). Wiring en `servicio-usuarios.yml`, `docker-compose.prod.yml`, `.env.example`. Compila.

---

## 🟡 FRONTEND

- [x] **F1 · WebSocket sin fallback de producción** → chat/notificaciones se rompían vía ngrok/prod. ✅ `stomp-client.ts` ahora resuelve la URL igual que `api.ts`: en dev usa `ws://localhost:8086`, y en prod/ngrok (página no-localhost) usa **mismo-origen `wss://<host>/ws-mensajeria`** (nginx lo enruta a :8086). Funciona en dev Y en ngrok sin romper ninguno. Typecheck del front en verde.
- [x] **F2 · Re-suscripción rota tras reconexión** → chat/notificaciones dejaban de actualizar tras un corte. ✅ Ambos hooks (`use-notifications`, `use-stomp-chat`) ahora registran **siempre** `onConnect` (dispara al conectar y en cada reconexión), en vez de solo cuando no estaba conectado al montar. Typecheck en verde.
- [ ] **F3 · ~15 páginas del admin-master son shells vacíos** (métricas, finanzas/facturas y payouts, marketing, auditoría, alertas). Implementar u ocultar. `src/app/admin-master/...`
- [x] **F4 · El home público cae en propiedades mock** que enlazaban a `/property/[id]` → 404 en prod. ✅ Quitado el `fallbackDestacados()` (mocks) del home: si el backend está vacío o falla, se muestra vacío en vez de propiedades falsas. Removidos los imports `MOCK_PROPIEDADES`/`distanciaAUpeuKm` sin uso. Typecheck en verde. `src/app/(public)/page.tsx`
- [ ] **F5 · Sin SEO/Open Graph en fichas de propiedad** — la página es `'use client'`, sin `generateMetadata`. Convertir a server component con OG. Agregar `sitemap.ts`, `robots.ts`, `manifest.ts`. `src/app/(public)/property/[id]/page.tsx`
- [ ] **F6 · Dark mode inconsistente + dos design systems.** Chrome de admin/landlord con hex hardcodeado; conviven `legacy-*` y moderno; dep muerta `next-themes`. Normalizar a tokens semánticos y unificar. `admin-master/layout.tsx`, `landlord/layout.tsx`, `components/ui/legacy-*`

---

## 🟡 TESTS

- [ ] **T1 · Tests de integración de la saga, el webhook y el overlap de reservas** (Testcontainers con Postgres/Kafka). Hoy: 0.
- [ ] **T2 · Tests de auth/OTP/lockout/RBAC** en usuarios. Hoy: solo validadores.
- [ ] **T3 · CI corre `mvn test` sin Postgres/Kafka** → los `contextLoads` probablemente fallan. Provisionar servicios en el job o usar Testcontainers + `application-test.yml`. `.github/workflows/ci.yml`
- [ ] **T4 · Al menos un smoke test end-to-end** + script para correrlo.

---

## 🔵 PARA QUE BRILLE — Producto

- [ ] **G1 · Payout al arrendador** (split de marketplace en MercadoPago o transferencias). Hoy el arrendador **nunca cobra**; `montoArrendador` se calcula pero no se desembolsa. `MercadoPagoConfiguration.java`, `ResumenFinancieroService.java:48-52`
- [ ] **G2 · Renta mensual recurrente** con recordatorios/facturas (hoy solo un cobro único por adelantado).
- [ ] **G3 · Garantía / depósito** (captura, retención y devolución).
- [ ] **G4 · Generación de contrato** (PDF + firma electrónica).
- [ ] **G5 · Reconciliación con MercadoPago** para pagos en `PENDIENTE_REVISION`/`DISCREPANCIA` y re-encolado de eventos varados.
- [ ] **G6 · Búsqueda geoespacial "cerca de mí"** (radio/bounding-box) + búsquedas guardadas y alertas para estudiantes.
- [ ] **G7 · Refresh tokens** y auto-renovación de sesión (hoy 24h fijas, expulsa a media sesión).
- [ ] **G8 · Borrado de cuenta / GDPR**, cambio de email/teléfono con re-verificación, y **audit log** de acciones de admin.

## 🔵 PARA QUE BRILLE — Diseño / Operación

- [ ] **D1 · PWA / experiencia móvil instalable** (`manifest.ts` + service worker).
- [ ] **D2 · i18n real** (next-intl está andamiado pero el 99% del texto está hardcodeado en español).
- [ ] **D3 · Migrar de whatsapp-web.js a WhatsApp Business API / Twilio** (riesgo de baneo) con **fallback de email** para el OTP.
- [ ] **D4 · Pulido visual final**: retirar assets default de Next en `public/`, reemplazar `<img>` crudos por `next/image`, refactorizar `properties/add/page.tsx` (2166 líneas) y consolidar servicios duplicados (catalog/reviews/messaging).

---

## ✅ Lo que ya está bien (no tocar, solo referencia)

- Outbox transaccional + idempotencia de consumidores (`processed_events`).
- Saga persistida con compensación y scheduler de reintentos.
- Locking optimista (`@Version`) + pesimista (`findByIdForUpdate`) contra doble-booking.
- Resilience4j (circuit breaker/retry/bulkhead/timeout) en cada llamada Feign.
- Webhook MP con HMAC (comparación constante) + re-fetch del pago como fuente de verdad.
- Reseñas verified-stay (solo con reserva FINALIZADA) + agregación de rating.
- Tracing distribuido (Micrometer + Zipkin) sobre REST/Feign/Kafka.
- Chat feature-complete (persistencia, paginación, read receipts, typing, moderación, WS con handshake JWT).
- Consumidor Kafka de notificaciones con retry + backoff + DLQ.
- Frontend: protección de rutas por rol en profundidad, estados de carga/error/vacío reutilizables, validación Zod fuerte, mapas/carruseles/comparador/calendario ya construidos.
- Multi-universidad (Fase 1) ya migrado en catálogos.

---

_Generado por revisión completa multi-agente. Actualiza la tabla de progreso al marcar tareas._
