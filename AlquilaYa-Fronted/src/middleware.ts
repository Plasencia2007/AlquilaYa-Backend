import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeTokenPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Decodificar base64 (UTF-8 compatible)
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const { pathname } = request.nextUrl;

  const payload = token ? decodeTokenPayload(token) : null;
  const rol = payload?.rol || null;
  const isExpired = payload ? payload.exp < Math.floor(Date.now() / 1000) : true;
  const estaAutenticado = !!payload && !isExpired;

  let response: NextResponse | null = null;

  // --- 1. Rutas privadas de administrador (/admin-master) ---
  if (pathname.startsWith('/admin-master')) {
    if (!estaAutenticado) {
      response = NextResponse.redirect(new URL('/', request.url));
    } else if (rol !== 'ADMIN') {
      response = NextResponse.redirect(new URL('/', request.url));
    }
  }
  // --- 2. Rutas privadas de proveedor (/landlord) ---
  else if (pathname.startsWith('/landlord')) {
    if (!estaAutenticado) {
      response = NextResponse.redirect(new URL('/', request.url));
    } else if (rol !== 'PROVEEDOR') {
      response = NextResponse.redirect(new URL('/', request.url));
    }
  }
  // --- 3. Rutas privadas de estudiante (/student) ---
  else if (pathname.startsWith('/student')) {
    if (!estaAutenticado) {
      response = NextResponse.redirect(new URL('/', request.url));
    } else if (rol !== 'ESTUDIANTE') {
      response = NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Si no hay redirección necesaria, continuar
  if (!response) {
    response = NextResponse.next();
  }

  // ESTRATEGIA SEGURIDAD 1000%: Desactivar caché en rutas privadas para evitar
  // que el navegador muestre versiones cacheadas (bfcache) al usar el botón "Atrás".
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
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - rooms (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|rooms).*)',
  ],
};
