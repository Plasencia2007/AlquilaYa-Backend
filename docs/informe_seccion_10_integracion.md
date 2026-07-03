# 10. INTEGRACIÓN FRONTEND–BACKEND

Este capítulo detalla la estrategia de integración e interoperabilidad entre la interfaz de usuario desarrollada en **Next.js** y la arquitectura de microservicios. Se especifican el enrutamiento centralizado bajo el proxy de Nginx, la persistencia de sesión a través del almacenamiento de cookies coordinado con **Zustand**, el cliente HTTP Axios con interceptores de seguridad, el canal de comunicación síncrona en tiempo real con WebSockets (STOMP) y las validaciones de esquemas en el cliente mediante **Zod**.

---

## 10.1. Punto 1: Arquitectura de Consumo y Enrutamiento (Nginx Reverse Proxy)

### 10.1.1. Sustento Técnico y Decisiones de Diseño
En entornos de producción, exponer los microservicios individuales directamente al navegador web introduce serios riesgos de seguridad y latencia, además de forzar la configuración de complejas políticas CORS en cada backend. Para solucionar esto, implementamos un proxy inverso central con **Nginx** que actúa como el único punto de entrada HTTP en el puerto 80. Nginx canaliza las peticiones `/api/v1/*` hacia el API Gateway, y sirve los recursos del frontend Next.js de forma transparente. Esto asegura que el cliente consuma recursos bajo el mismo origen, resolviendo la colisión de CORS.

### 10.1.2. Mapeo de Enrutamiento y Puertos
La Tabla XIII describe el enrutamiento físico y lógico de las peticiones que ingresan a través del puerto 80 de Nginx.

<div align="center">
  
**TABLA XIII**  
**MAPEO DE RUTAS EN NGINX PROXY**

| Path HTTP Solicitado | Destino del Proxy | Contenedor Destino | Propósito Técnico |
|:---|:---|:---|:---|
| `/` | `http://frontend:3000/` | `alquilaya-frontend` | Sirve la landing page y recursos estáticos de Next.js. |
| `/api/v1/usuarios/**` | `http://api-gateway:8080/` | `alquilaya-gateway` | Enruta peticiones del perfil y OTP de usuarios. |
| `/api/v1/propiedades/**`| `http://api-gateway:8080/` | `alquilaya-gateway` | Enruta consultas de cuartos y ciclo de reservas. |
| `/api/v1/pagos/**` | `http://api-gateway:8080/` | `alquilaya-gateway` | Enruta webhooks y solicitudes de Checkout de MercadoPago. |

</div>

### 10.1.3. Evidencia de Configuración Crítica: Enrutamiento en Nginx (`nginx.conf`)
El bloque de configuración implementado en Nginx gestiona las redirecciones de la API y el soporte de Server-Side Rendering (SSR) del frontend:

```nginx
server {
    listen 80;
    server_name localhost;

    # Enrutar peticiones de API al Gateway
    location /api/v1/ {
        proxy_pass http://api-gateway:8080/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Enrutar el resto del tráfico al Frontend de Next.js
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 10.2. Punto 2: Gestión y Persistencia del Estado de Autenticación (JWT + Zustand + Cookies)

### 10.2.1. Sustento Técnico y Decisiones de Diseño
El frontend requiere una forma rápida y reactiva de saber si el usuario inició sesión, cuál es su rol (`ESTUDIANTE` o `ARRENDADOR`) y sus detalles de perfil, para pintar dinámicamente la barra de navegación y restringir páginas. Para lograrlo, implementamos una sincronización híbrida: el token JWT se almacena de forma persistente en las **Cookies del navegador** (usando `js-cookie`), permitiendo que sobreviva a recargas de página. Al arrancar, el almacén global de **Zustand** extrae el token, decodifica el payload y lo guarda en memoria reactiva de la aplicación.

### 10.2.2. Modelo de Flujo de Inicialización
La Tabla XIV detalla el comportamiento del flujo de inicialización del estado de autenticación.

<div align="center">
  
**TABLA XIV**  
**PASOS DE INICIALIZACIÓN DEL ESTADO DE AUTENTICACIÓN**

| Paso | Componente | Acción Realizada | Estado Resultante |
|:---|:---|:---|:---|
| 1 | `useAuthStore` | Invoca el método `inicializar()` al cargar el hook del layout. | `cargando: true` |
| 2 | `Cookies` | Busca la presencia de la cookie de sesión `auth-token`. | Si no existe, establece `estaAutenticado: false` y limpia la store. |
| 3 | `servicioAuth` | Si existe la cookie, extrae el string y decodifica los claims base64. | Extrae `userId`, `perfilId`, `rol` y `nombre`. |
| 4 | `useAuthStore` | Inyecta el usuario decodificado en la memoria reactiva de la app. | `estaAutenticado: true`, `cargando: false` |

</div>

### 10.2.3. Evidencia de Código Crítico: Store de Autenticación (`auth-store.ts`)
La store de Zustand maneja la persistencia y la sincronización con las llamadas asíncronas de la API:

```typescript
import { create } from 'zustand';
import Cookies from 'js-cookie';
import { Usuario, EstadoAuth } from '@/types/auth';
import { servicioAuth } from '@/services/auth-service';

interface AccionesAuth {
  iniciarSesion: (correo: string, contrasena: string) => Promise<Usuario | null>;
  cerrarSesion: () => void;
  inicializar: () => void;
}

const estadoInicial: EstadoAuth = {
  usuario: null,
  estaAutenticado: false,
  cargando: true,
};

export const useAuthStore = create<EstadoAuth & AccionesAuth>((set) => ({
  ...estadoInicial,

  inicializar: () => {
    const token = Cookies.get('auth-token');
    if (token) {
      // Decodificar claims sin ir al servidor (operación instantánea en cliente)
      const usuario = servicioAuth.obtenerUsuarioActualDesdeToken(token);
      if (usuario) {
        set({ usuario, estaAutenticado: true, cargando: false });
        return;
      }
    }
    set({ usuario: null, estaAutenticado: false, cargando: false });
  },

  iniciarSesion: async (correo: string, contrasena: string) => {
    set({ cargando: true });
    try {
      const usuario = await servicioAuth.iniciarSesion(correo, contrasena);
      if (usuario) {
        set({ usuario, estaAutenticado: true, cargando: false });
        return usuario;
      }
      set({ cargando: false });
      return null;
    } catch (error) {
      set({ cargando: false });
      throw error;
    }
  },

  cerrarSesion: () => {
    servicioAuth.cerrarSesion(); // Remueve cookie
    set({ ...estadoInicial, cargando: false });
  }
}));
```

---

## 10.3. Punto 3: Cliente HTTP de Integración (Axios Interceptors y Manejo de Errores)

### 10.3.1. Sustento Técnico y Decisiones de Diseño
Para evitar inyectar de forma manual la cabecera `Authorization: Bearer <token>` en cada una de las peticiones REST, configuramos una instancia global de **Axios**. Esta instancia cuenta con dos interceptores:
1.  **Request Interceptor:** Lee de forma automática la cookie `auth-token` e inyecta la cabecera de autenticación antes de disparar la petición HTTP al proxy de Nginx.
2.  **Response Interceptor:** Analiza de forma global las respuestas de error del servidor. Si un microservicio responde con un estado **HTTP 401 Unauthorized** (debido a token expirado o revocado en Redis), el interceptor borra la cookie local y redirige al usuario a la página de login automáticamente.

### 10.3.2. Tabla de Respuestas y Comportamiento de Errores
La Tabla XV detalla el comportamiento del interceptor de Axios ante códigos de error HTTP devueltos por el backend.

<div align="center">
  
**TABLA XV**  
**COMPORTAMIENTO DEL INTERCEPTOR DE ERRORES**

| Código HTTP | Causa Técnica | Acción del Interceptor | Impacto en la Experiencia de Usuario |
|:---|:---|:---|:---|
| **HTTP 401** | Token JWT expirado o revocado. | Remueve la cookie `auth-token` y ejecuta `window.location.href = '/'`. | Cierra la sesión y muestra el modal de inicio de sesión de nuevo. |
| **HTTP 403** | Usuario sin privilegios suficientes. | Propaga la excepción sin redirigir. | El componente muestra un mensaje: "No tienes permiso para esto". |
| **HTTP 429** | Límite de peticiones alcanzado. | Captura el error en la cola de Rate Limit. | Muestra alerta Toast: "Demasiadas peticiones. Intenta luego". |
| **HTTP 500** | Excepción no controlada en backend. | Formatea el payload mediante `parseAxiosError`. | Muestra alerta Toast: "Error interno del servidor". |

</div>

### 10.3.3. Evidencia de Código Crítico: Instanciación de Axios (`api.ts`)
La configuración del cliente Axios unificado gestiona los interceptores de seguridad:

```typescript
import axios from 'axios';
import Cookies from 'js-cookie';

let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/v1/';

// Si estamos en producción y se consume de IP remota, adapta dinámicamente la URL base
if (typeof window !== 'undefined' && API_URL.includes('localhost') && window.location.hostname !== 'localhost') {
  API_URL = `${window.location.protocol}//${window.location.host}/api/v1/`;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor Request: Inyección automática de token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth-token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor Response: Manejo global de expiraciones 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('auth-token'); // Limpieza de sesión
      if (typeof window !== 'undefined') {
        window.location.href = '/'; // Redirección
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 10.4. Punto 4: Consumo de Tiempo Real (WebSocket STOMP en el Cliente)

### 10.4.1. Sustento Técnico y Decisiones de Diseño
El chat interactivo requiere latencia de milisegundos y persistencia en la conexión. Para ello, el cliente Next.js utiliza la librería `@stomp/stompjs` para conectarse directamente al microservicio de mensajería (`ws-mensajeria` en el puerto `8086`). Para mantener un consumo de recursos eficiente, el cliente implementa un patrón **Singleton**: se establece una única conexión WebSocket compartida por toda la pestaña del navegador. Al conectarse, inyecta el JWT en los `connectHeaders`, permitiendo que el servidor autentique al usuario en el canal de red.

### 10.4.2. Flujo de Suscripción del WebSocket
La Tabla XVI detalla las colas STOMP suscritas por el cliente y su comportamiento al recibir eventos.

<div align="center">
  
**TABLA XVI**  
**SUSCRIPCIONES WEB-SOCKET Y ACCIONES**

| Cola Suscrita | Tipo de Evento | Estructura del Payload | Acción en la UI |
|:---|:---|:---|:---|
| `/user/queue/conversacion.{id}` | `MensajeDTO` | `{ id, contenido, emisorId, fecha }` | Añade el mensaje al historial de chat con animación de entrada. |
| `/user/queue/conversacion.{id}.eventos`| Evento control | `{ tipo: "MENSAJES_LEIDOS" }` | Cambia las viñetas del chat de enviado a doble check azul. |
| `/user/queue/conversacion.{id}.eventos`| Evento moderación| `{ tipo: "CONVERSACION_SUSPENDIDA" }` | Deshabilita la caja de texto y muestra aviso: "Chat suspendido". |

</div>

### 10.4.3. Evidencia de Código Crítico: Cliente WebSocket Singleton (`stomp-client.ts`)
El singleton del cliente STOMP controla las suscripciones en cola antes y después de establecer la sesión de red:

```typescript
'use client';

import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import Cookies from 'js-cookie';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8086/ws-mensajeria';
type Listener = (msg: IMessage) => void;

class StompClientSingleton {
  private client: Client | null = null;
  private connected = false;
  private subscriptions = new Map<string, StompSubscription>();
  private pending: { destination: string; listener: Listener }[] = [];

  connect(): void {
    if (this.client && this.client.active) return;
    const token = Cookies.get('auth-token');
    if (!token) return;

    this.client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` }, // Autenticación de socket
      reconnectDelay: 5000,
      onConnect: () => {
        this.connected = true;
        this.pending.forEach((sub) => this.activateSubscription(sub.destination, sub.listener));
        this.pending = [];
      },
      onWebSocketClose: () => {
        this.connected = false;
      }
    });
    this.client.activate();
  }

  subscribe(destination: string, listener: Listener): () => void {
    if (!this.client || !this.connected) {
      const entry = { destination, listener };
      this.pending.push(entry);
      return () => {
        this.pending = this.pending.filter((p) => p !== entry);
      };
    }
    return this.activateSubscription(destination, listener);
  }

  private activateSubscription(destination: string, listener: Listener): () => void {
    if (!this.client || !this.connected) return () => {};
    const sub = this.client.subscribe(destination, listener);
    this.subscriptions.set(destination, sub);
    return () => {
      sub.unsubscribe();
      this.subscriptions.delete(destination);
    };
  }

  publish(destination: string, body?: object): void {
    if (!this.client || !this.connected) return;
    this.client.publish({
      destination,
      body: body ? JSON.stringify(body) : '',
    });
  }
}

export const stompClient = new StompClientSingleton();
```

---

## 10.5. Punto 5: Formularios Reactivos y Validación de Esquemas en Cliente (React Hook Form + Zod)

### 10.5.1. Sustento Técnico y Decisiones de Diseño
Para proveer una experiencia fluida, el frontend valida los datos de entrada de forma inmediata conforme el usuario escribe. Implementamos **Zod** acoplado a **React Hook Form** a través del adaptador resolver. Los esquemas de Zod actúan como la primera barrera de seguridad: validan la fortaleza de contraseñas, la longitud del DNI (8 dígitos), y la estructura internacional del teléfono móvil antes de enviar la petición REST, ahorrando peticiones fallidas al backend.

### 10.5.2. Reglas de Validación de Esquemas de Entrada
La Tabla XVII muestra las restricciones aplicadas en el esquema de registro en el frontend.

<div align="center">
  
**TABLA XVII**  
**REGLAS DE VALIDACIÓN ZOD - REGISTRO DE USUARIOS**

| Campo | Tipo Zod | Regla de Validación Aplicada | Mensaje de Error en UI |
|:---|:---|:---|:---|
| `correo` | `string().email()` | Debe cumplir con la estructura de correo. | "Email inválido" |
| `dni` | `string().regex()` | Expresión regular: `/^[0-9]{8}$/` (8 dígitos exactos). | "DNI: 8 dígitos" |
| `password` | `string().min(8)` | Mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 símbolo. | "Falta una mayúscula / símbolo" |
| `telefono` | `string().regex()` | Expresión regular: `/^\+519\d{8}$/` (Prefijo de Perú + 9). | "Teléfono inválido. Debe empezar con +51 y tener 9 dígitos" |

</div>

### 10.5.3. Evidencia de Código Crítico: Esquema de Registro Zod (`auth-schema.ts`)
El validador declara las directrices estrictas para el registro y la verificación OTP de los estudiantes y arrendadores:

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  apellido: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  dni: z.string().regex(/^[0-9]{8}$/, 'DNI: 8 dígitos'),
  correo: z.string().min(1, 'El correo es requerido').email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Falta una mayúscula')
    .regex(/[a-z]/, 'Falta una minúscula')
    .regex(/[0-9]/, 'Falta un número')
    .regex(/[@$!%*?&]/, 'Falta un símbolo (@$!%*?&)'),
  telefono: z
    .string()
    .min(1, 'El teléfono es requerido')
    .regex(/^\+519\d{8}$/, 'Teléfono inválido. Debe empezar con +51 y tener 9 dígitos'),
  rol: z.enum(['ESTUDIANTE', 'ARRENDADOR'] as const, {
    errorMap: () => ({ message: 'Selecciona un rol de usuario' }),
  }),
});

export const otpSchema = z.object({
  codigo: z.string().regex(/^[0-9]{6}$/, 'Ingresa los 6 dígitos del código OTP'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type OtpFormData = z.infer<typeof otpSchema>;
```
