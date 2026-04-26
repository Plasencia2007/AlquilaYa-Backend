'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, Share2 } from 'lucide-react';

const HIDDEN_ROUTES = ['/admin-master', '/landlord', '/student', '/property', '/search', '/favorites'];

const links = [
  { href: '#', label: 'Política de privacidad' },
  { href: '#', label: 'Términos de servicio' },
  { href: '#', label: 'Centro de ayuda' },
  { href: '#', label: 'Sé partner' },
];

export default function Footer() {
  const pathname = usePathname();
  const isHidden = pathname ? HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) : false;

  if (isHidden) return null;

  return (
    <footer className="flex w-full flex-col items-center justify-between gap-8 border-t border-border bg-background px-12 py-12 md:flex-row">
      <div className="flex flex-col items-center gap-4 md:items-start">
        <span className="text-xl font-black tracking-tighter text-primary">AlquilaYa</span>
        <p className="max-w-xs text-center text-sm tracking-wide text-muted-foreground md:text-left">
          © 2026 AlquilaYa. Curating Urban Living for the Modern Professional.
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

      <div className="flex gap-4">
        <button
          type="button"
          aria-label="Cambiar idioma"
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          <Globe className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Compartir"
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          <Share2 className="size-5" aria-hidden />
        </button>
      </div>
    </footer>
  );
}
