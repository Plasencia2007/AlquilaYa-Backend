'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, ShieldCheck } from 'lucide-react';

const HIDDEN_ROUTES = ['/admin-master', '/landlord', '/student', '/property', '/search', '/favorites', '/register'];

const SUPPORT_EMAIL = 'soporte@alquilaya.pe';

// Solo se enlazan rutas que existen de verdad (ítem 95): las páginas legales,
// FAQ y "Nosotros" se crean en este mismo lote; /arrendadores lo crea otra
// agente en paralelo; las variantes de /search ya existen. Sin `href="#"`.
const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Buscar cuartos', href: '/search' },
      { label: 'Departamentos', href: '/search?tipo=DEPARTAMENTO' },
      { label: 'Cuartos individuales', href: '/search?tipo=CUARTO' },
      { label: 'Publica tu cuarto', href: '/arrendadores' },
    ],
  },
  {
    title: 'Soporte',
    links: [
      { label: 'Preguntas frecuentes', href: '/faq' },
      { label: 'Sobre nosotros', href: '/nosotros' },
      { label: 'Contacto', href: `mailto:${SUPPORT_EMAIL}`, external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos y condiciones', href: '/terminos' },
      { label: 'Política de privacidad', href: '/privacidad' },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  const isHidden = pathname ? HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) : false;

  if (isHidden) return null;

  return (
    <footer className="w-full border-t border-border bg-card px-6 py-12 md:px-12">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4">
        {/* Marca + contacto. No se inventan redes sociales (no hay cuentas reales
            en el código); el único canal real es el correo de soporte. */}
        <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
          <Link href="/" className="text-2xl font-black tracking-tighter text-primary">
            AlquilaYa
          </Link>
          <p className="text-xs leading-relaxed text-muted-foreground">
            La plataforma para estudiantes de la UPeU. Encuentra tu hogar ideal a minutos de tu
            facultad.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-1 inline-flex w-fit items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <Mail className="size-4" aria-hidden />
            {SUPPORT_EMAIL}
          </a>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground">
              {col.title}
            </h4>
            <ul className="space-y-2 text-sm">
              {col.links.map((link) =>
                link.external ? (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ) : (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
            {col.title === 'Legal' && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/20 bg-success-light p-2 text-xs text-success">
                <ShieldCheck className="size-4 shrink-0" aria-hidden />
                <span>Pagos con Mercado Pago · Datos protegidos</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-7xl border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AlquilaYa. Todos los derechos reservados. Desarrollado para la
        comunidad UPeU.
      </div>
    </footer>
  );
}
