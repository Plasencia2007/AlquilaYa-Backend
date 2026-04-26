'use client';

import { usePathname } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';

import { TopBar } from './top-bar';

const HIDDEN_ROUTES = ['/login', '/register', '/admin-master', '/landlord', '/student'];

export function Navbar() {
  const pathname = usePathname();
  const { usuario, estaAutenticado } = useAuth();

  const isHidden = pathname ? HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) : false;
  if (isHidden) return null;

  if (estaAutenticado && usuario?.rol === 'ARRENDADOR') return null;

  return <TopBar />;
}
