# Resumen del Proyecto: AlquilaYa 🏠🚀

Este documento centraliza el estado actual de la infraestructura, seguridad y lógica de negocio del ecosistema AlquilaYa.

## 🌉 1. Arquitectura de Microservicios (Backend)
El backend está construido con **Spring Cloud** y se comunica a través de un **API Gateway**.

### 🛠️ Configuración de Red
- **API Gateway**: `http://localhost:8080` (Puerto de entrada único).
- **Eureka Server**: `http://localhost:8761` (Descubrimiento de servicios).
- **Config Server**: `http://localhost:8888` (Configuración centralizada).

### 🛡️ Seguridad e Infraestructura (Nuevos Ajustes)
- **CORS**: Gestionado **exclusivamente** en el API Gateway para evitar conflictos en el navegador. Origen permitido: `http://localhost:3000`.
- **JWT**: Clave secreta configurada en formato Base64 para garantizar la compatibilidad entre servicios.
- **Microservicios**:
    *   **Servicio Usuarios**: Implementa Auth (Login/Registro) con BCrypt y generación de tokens JWT.
    *   **Base de Datos**: PostgreSQL para persistencia de usuarios y roles.

---

## 🎨 2. Frontend (Next.js 15)
El frontend se comunica con el Gateway y gestiona la sesión mediante cookies de seguridad.

### 🎭 Lógica de Roles y Sincronización
Se ha unificado la nomenclatura de roles entre el Backend (Java Enum) y el Frontend (TypeScript):
- **ARRENDADOR**: Dueño de inmuebles. Su mundo es el Dashboard profesional.
- **ESTUDIANTE**: Usuario que busca alquileres.
- **ADMIN**: Administrador del sistema.

### 🚀 Flujo de Usuario Profesional
- **Redirección Directa**: Al iniciar sesión como `ARRENDADOR`, el sistema redirige instantáneamente a `/landlord/dashboard`.
- **Navegación Blindada**: Se ha configurado un **Middleware** que:
    1.  Bloquea el acceso a rutas de otros roles.
    2.  Fuerza al Arrendador a permanecer en su Dashboard (si intenta entrar al inicio público, el sistema lo devuelve a su panel).
    3.  Oculta el Navbar público para el rol Arrendador, garantizando una interfaz técnica y limpia.

---

## 📂 Documentación Adicional
- **[infrastructure_guide.md](file:///C:/Users/jhons/.gemini/antigravity/brain/85cb7f7f-6007-48f3-8948-376b955aeab9/infrastructure_guide.md)**: Guía técnica de bajo nivel sobre CORS, JWT y Gateway.
- **Postman Collection**: Ubicada en `/docs/postman/AlquilaYa_API.json` para pruebas de integración.

---
> [!IMPORTANT]
> **Estado Actual**: Infraestructura de Autenticación y Navegación completada al 100% y verificada. La comunicación Frontend-Backend es estable.
