# Servicio de Notificaciones (WhatsApp)

Este microservicio es responsable de toda la comunicación saliente a través de WhatsApp Web. Está construido con Node.js para aprovechar la asincronía y la librería `whatsapp-web.js`.

## Funcionamiento del QR

Al iniciar el servicio por primera vez, se generará un código QR en la consola de comandos. Debe ser escaneado con una cuenta de WhatsApp (como si fuera WhatsApp Web) para vincular el bot.

## Endpoints Disponibles

### 1. Enviar Código OTP
- **Ruta**: `POST /api/v1/notifications/whatsapp/send-otp`
- **Body**: `{"telefono": "+51999888777", "codigo": "123456"}`
- **Descripción**: Envía un mensaje preformateado con el código de verificación de 6 dígitos.

### 2. Enviar Mensaje Genérico
- **Ruta**: `POST /api/v1/notifications/whatsapp/send-message`
- **Body**: `{"telefono": "+51999888777", "mensaje": "Tu documento ha sido aprobado"}`
- **Descripción**: Permite a otros microservicios (como el de Usuarios) enviar alertas personalizadas sobre cambios de estado.

## Integración con Spring Boot

El `Servicio Usuarios` se comunica con este servicio mediante un cliente HTTP interno definido en `NotificationService`.

```java
// Ejemplo de llamada interna
restTemplate.postForEntity(whatsappServiceUrl + "/send-message", request, String.class);
```

## Solución de Problemas
- **Sesión cerrada**: Si el servicio deja de enviar mensajes, verifica la consola para ver si es necesario re-escanear el código QR.
- **Formato de teléfono**: El número debe incluir el código de país (ej: `+51` para Perú).
