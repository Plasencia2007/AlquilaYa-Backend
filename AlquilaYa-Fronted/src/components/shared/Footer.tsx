'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, MessageCircle, ShieldCheck } from 'lucide-react';

const HIDDEN_ROUTES = ['/admin-master', '/landlord', '/student', '/property', '/search', '/favorites'];

export default function Footer() {
  const pathname = usePathname();
  const isHidden = pathname ? HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) : false;

  if (isHidden) return null;

  return (
    <footer className="w-full border-t border-border bg-card px-6 py-12 md:px-12">
      <div className="mx-auto max-w-7xl grid grid-cols-1 gap-8 md:grid-cols-4">
        <div className="flex flex-col gap-3">
          <span className="text-2xl font-black tracking-tighter text-primary">AlquilaYa</span>
          <p className="text-xs leading-relaxed text-muted-foreground">
            La plataforma definitiva para estudiantes de la UPeU. Encuentra tu hogar ideal a minutos de tu facultad.
          </p>
          <div className="flex gap-4 mt-2">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Mail className="size-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <MessageCircle className="size-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Plataforma</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/search" className="text-muted-foreground hover:text-primary transition-colors">Buscar cuartos</Link></li>
            <li><Link href="/search?tipo=DEPARTAMENTO" className="text-muted-foreground hover:text-primary transition-colors">Departamentos</Link></li>
            <li><Link href="/search?tipo=CUARTO" className="text-muted-foreground hover:text-primary transition-colors">Cuartos individuales</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Soporte</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Centro de ayuda</Link></li>
            <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Contacto</Link></li>
            <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Preguntas frecuentes</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Política de privacidad</Link></li>
            <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Términos de servicio</Link></li>
          </ul>
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
            <ShieldCheck className="size-4 shrink-0" />
            <span>Pagos y datos 100% protegidos</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AlquilaYa. Todos los derechos reservados. Desarrollado para la comunidad UPeU.
      </div>
    </footer>
  );
}
