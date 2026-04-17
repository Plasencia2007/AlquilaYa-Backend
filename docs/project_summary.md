# Proyecto AlquilaYa - Resumen General

Bienvenido al centro de documentación de **AlquilaYa**. Este documento sirve como una guía viva del estado actual del proyecto, su arquitectura y tecnologías.

## 🏗️ Arquitectura del Sistema
El proyecto sigue un patrón de **Microservicios** en el backend con un frontend desacoplado en **Next.js**.

### Componentes del Backend (Spring Cloud)
| Servicio | Puerto | Descripción |
| :--- | :--- | :--- |
| `discovery-server` | 8761 | Registro de servicios (Netflix Eureka). |
| `config-server` | 8888 | Gestión centralizada de archivos YAML/Properties. |
| `api-gateway` | 8080 | Puerta de enlace única y gestión de CORS. |
| `servicio-usuarios` | Dinámico | Manejo de usuarios, roles y autenticación (JWT). |

## 🚀 Orden de Arranque Recomendado
Para que el sistema funcione correctamente, arranca los servicios en este orden:
1.  **`discovery-server`**: Servidor de registro.
2.  **`config-server`**: Servidor de configuración.
3.  **`api-gateway`**: Puerta de enlace.
4.  **`servicio-usuarios`**: Servicio de negocio.

### Componentes del Frontend (Next.js)
| Carpeta | Stack | Descripción |
| :--- | :--- | :--- |
| `AlquilaYa-Fronted` | Next.js 16, React 19, Zustand, Tailwind 4 | Interfaz de usuario premium y lógica de cliente. |

### Herramientas de Pruebas
| Carpeta | Herramienta | Descripción |
| :--- | :--- | :--- |
| `postman` | Postman | Colecciones de peticiones JSON para probar la API sin el frontend. |
| `database` | PostgreSQL Scripts | Scripts SQL (`schema.sql` y `data.sql`) para inicializar la base de datos de forma manual. |

---

## 🚀 Tecnologías Principales

### Backend
- **Lenguaje:** Java 21
- **Framework:** Spring Boot 3.5.x
- **Seguridad:** Spring Security + JWT (jjwt)
- **Base de Datos:** PostgreSQL
- **Mensajería:** Kafka
- **Infraestructura:** Spring Cloud Discovery & Gateway

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Estilos:** Tailwind CSS v4 + Radix UI
- **Estado:** Zustand (Auth store)
- **Comunicación:** Axios con interceptores para JWT
- **Iconos:** Lucide React

---

## 🛠️ Configuración de Conexión
Actualmente, el frontend y el backend se comunican a través del **Gateway** (Puerto 8080).
- **Variable de Entorno:** `NEXT_PUBLIC_API_URL` en `.env.local` apunta a `http://localhost:8080`.
- **Rutas API:** 
  - Login: `/usuarios/auth/login`
  - Registro: `/usuarios/auth/register`

---

## 📝 Estado del Proyecto: En Desarrollo
- [x] Infraestructura de Microservicios base.
- [x] Servicio de Usuarios con Auth JWT.
- [x] Configuración de Gateway y CORS.
- [x] Frontend con Auth Provider y Zustand.
- [x] Configuración de variables de entorno (`.env.local`).
- [ ] Implementación de servicios de Propiedades/Alquileres.
- [ ] Dashboards de usuario y administración.

---
> **Nota:** Este documento debe actualizarse cada vez que se agregue un nuevo servicio, funcionalidad mayor o cambio en la arquitectura.
