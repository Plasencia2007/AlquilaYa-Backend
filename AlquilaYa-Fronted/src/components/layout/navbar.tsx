'use client';

import { usePathname } from 'next/navigation';

import { TopBar } from './top-bar';

const HIDDEN_ROUTES = ['/login', '/register', '/admin-master', '/landlord', '/student', '/search'];

export function Navbar() {
  const pathname = usePathname();

  // La navbar pública se muestra en las rutas públicas para TODOS los roles
  // (ítem 102): un ARRENDADOR/ADMIN logueado también debe poder navegar el home
  // y ver los avisos. Las rutas privadas (y login/register/search) quedan fuera
  // vía HIDDEN_ROUTES; el CTA por rol lo resuelve NavbarAuthActions.
  const isHidden = pathname ? HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) : false;
  if (isHidden) return null;

  return <TopBar />;
}
