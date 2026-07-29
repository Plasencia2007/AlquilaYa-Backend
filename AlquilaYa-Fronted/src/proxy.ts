import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Proxy de Next 16 (antes "middleware"). Se ejecuta antes de renderizar rutas
// y se usa para autenticación basada en cookie + redirecciones por rol.

function decodeTokenPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const { pathname } = request.nextUrl;

  const payload = token ? decodeTokenPayload(token) : null;
  const rol = payload?.rol || null;
  const isExpired = payload ? payload.exp < Math.floor(Date.now() / 1000) : true;
  const estaAutenticado = !!payload && !isExpired;

  // El home (`/`) y el buscador (`/search`) son PÚBLICOS para todos los roles
  // (ítem 102): un ARRENDADOR/ADMIN puede ver cómo lucen los anuncios y usar el
  // buscador tal como lo ve un estudiante. La redirección automática a su panel
  // ocurre sólo post-login (en el `useEffect` del home), no en cada visita.
  // Las rutas privadas siguen protegidas por rol más abajo.
  let response: NextResponse | null = null;

  // Rutas privadas /admin-master
  if (pathname.startsWith('/admin-master')) {
    if (!estaAutenticado || rol !== 'ADMIN') {
      response = NextResponse.redirect(new URL('/', request.url));
    }
  }
  // Rutas privadas /landlord
  else if (pathname.startsWith('/landlord')) {
    if (!estaAutenticado || rol !== 'ARRENDADOR') {
      response = NextResponse.redirect(new URL('/', request.url));
    }
  }
  // Rutas privadas /student
  else if (pathname.startsWith('/student')) {
    if (!estaAutenticado || rol !== 'ESTUDIANTE') {
      response = NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (!response) {
    response = NextResponse.next();
  }

  // Desactivar caché en rutas privadas para que el botón "Atrás" no muestre
  // contenido cacheado (bfcache) tras logout.
  if (
    pathname.startsWith('/admin-master') ||
    pathname.startsWith('/landlord') ||
    pathname.startsWith('/student')
  ) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
  }

  return response;
}

export const config = {
  matcher: [
    // Excluye api, assets de Next y la carpeta pública /rooms.
    '/((?!api|_next/static|_next/image|favicon.ico|rooms).*)',
  ],
};
