# Documentación de Proyecto AlquilaYa

Bienvenido a la documentación oficial del sistema AlquilaYa. Aquí encontrarás los detalles técnicos y flujos de trabajo de los módulos implementados.

## 📌 Guía de Documentos

1.  [**Arquitectura del Sistema**](./SYSTEM_OVERVIEW.md): Visión general de microservicios y diagrama de comunicación.
2.  [**Verificación de Identidad**](./IDENTITY_VERIFICATION.md): Flujo de subida y aprobación de documentos oficiales.
3.  [**Servicio de Notificaciones**](./NOTIFICATION_SERVICE.md): Configuración de WhatsApp Web y envío de mensajes/OTP.
4.  [**Capa de Validaciones**](./VALIDATION_PATTERNS.md): Implementación de Zod (Frontend) y Spring Validation (Backend).

---
## 🚀 Inicio Rápido

Para ejecutar el proyecto localmente, asegúrate de tener instalados:
-   Java 21 (JDK)
    -   Docker (para PostgreSQL) o una base de datos local llamada `alquilaya_db`.
    -   Node.js (v18+)

### Pasos:
1.  **Backend**: `cd servicio-usuarios && mvn spring-boot:run`
2.  **Notificaciones**: `cd servicio-notificaciones && node index.js` (Escanear QR cuando aparezca).
3.  **Frontend**: `cd AlquilaYa-Fronted && npm run dev`

---
*Última actualización: Abril 2026*
