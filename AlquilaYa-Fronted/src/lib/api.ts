import axios from 'axios';

let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1/';

if (typeof window !== 'undefined' && API_URL.includes('localhost') && window.location.hostname !== 'localhost') {
  API_URL = `${window.location.protocol}//${window.location.host}/api/v1/`;
}

// S5: tanto el access token como el refresh token viven en cookies httpOnly puestas por el
// backend — este código nunca los lee ni los escribe (JS no puede, por diseño: así resisten
// XSS). `withCredentials` hace que el navegador los mande solo en cada llamada; el gateway
// traduce el cookie de access token al header Authorization que esperan los servicios
// downstream (CookieToAuthorizationFilter), así que NINGÚN request interceptor hace falta acá.
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// G7: si varias peticiones reciben 401 a la vez, sólo se dispara UN refresh (las demás
// esperan la misma promesa) para no gastar de golpe la rotación del refresh token.
let refrescando: Promise<boolean> | null = null;

// S5: el refresh token vive en un cookie httpOnly — este código nunca lo lee (no puede). El
// navegador lo manda solo (withCredentials); el backend lo rota y devuelve las cookies
// nuevas vía Set-Cookie (access + refresh). Sólo necesitamos saber SI funcionó para
// reintentar la petición original — el propio cookie recién puesto la autentica.
async function intentarRefrescar(): Promise<boolean> {
  try {
    // axios "crudo" (no la instancia `api`) para no volver a disparar este mismo interceptor.
    const resp = await axios.post(
      `${API_URL}usuarios/auth/refresh`,
      {},
      { headers: { 'Content-Type': 'application/json' }, withCredentials: true },
    );
    return Boolean(resp.data?.autenticado);
  } catch {
    return false;
  }
}

// Interceptor para manejar errores globales (ej: 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const esRutaAuth = typeof original?.url === 'string' && original.url.includes('auth/');

    // G7: un 401 en una ruta protegida intenta renovar la sesión EN SILENCIO con el refresh
    // token, y reintenta la petición original UNA vez. Antes, cualquier 401 expulsaba al
    // usuario de inmediato aunque su sesión (refresh token) siguiera vigente.
    if (error.response?.status === 401 && original && !original._retry && !esRutaAuth) {
      original._retry = true;
      if (!refrescando) {
        refrescando = intentarRefrescar().finally(() => {
          refrescando = null;
        });
      }
      const ok = await refrescando;
      if (ok) {
        // El cookie de access token ya quedó renovado por el backend — sólo reintentar.
        return api(original);
      }
    }

    if (error.response?.status === 401) {
      // Sesión no recuperable (el backend ya limpió sus cookies si vino de un /logout, o
      // simplemente no había sesión) — mandar al home.
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);
