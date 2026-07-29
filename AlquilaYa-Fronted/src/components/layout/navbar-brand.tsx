'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';

import { Logo } from './logo';
import { Wordmark } from './wordmark';

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/search', label: 'Explorar' },
] as const;

interface NavbarBrandProps {
  /** Header sobre foto (hero de home sin scroll): texto e ícono en blanco. */
  transparent?: boolean;
  className?: string;
}

export function NavbarBrand({ transparent = false, className }: NavbarBrandProps) {
  const pathname = usePathname();

  return (
    <div className={cn('flex shrink-0 items-center gap-6 md:gap-12', className)}>
      <Link href="/" className="flex items-center gap-2.5 transition-transform active:scale-95">
        <Logo className={cn('h-7 w-7 transition-colors', transparent ? 'text-white' : 'text-primary')} />
        <Wordmark variant={transparent ? 'onDark' : 'themed'} />
      </Link>

      <nav className="hidden items-center gap-5 md:flex md:gap-12">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'font-headline text-xs font-black uppercase tracking-[0.2em] transition-colors',
                active
                  ? transparent ? 'text-white' : 'text-primary'
                  : transparent ? 'text-white/80 hover:text-white' : 'text-foreground hover:text-primary',
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
