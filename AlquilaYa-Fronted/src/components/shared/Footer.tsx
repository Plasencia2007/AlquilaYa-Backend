'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const HIDDEN_ROUTES = ['/admin-master', '/landlord', '/student', '/property', '/search', '/favorites'];

const links = [
  { href: '#', label: 'Política de privacidad' },
  { href: '#', label: 'Términos de servicio' },
  { href: '#', label: 'Centro de ayuda' },
];

export default function Footer() {
  const pathname = usePathname();
  const isHidden = pathname ? HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) : false;

  if (isHidden) return null;

  return (
    <footer className="flex w-full flex-col items-center justify-between gap-5 border-t border-border bg-background px-12 py-8 md:flex-row">
      <div className="flex flex-col items-center gap-2 md:items-start">
        <span className="text-xl font-black tracking-tighter text-primary">AlquilaYa</span>
        <p className="max-w-xs text-center text-sm text-muted-foreground md:text-left">
          © 2026 AlquilaYa · Encuentra tu cuarto ideal cerca de la UPeU.
        </p>
      </div>

      <nav className="flex flex-wrap justify-center gap-8">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
