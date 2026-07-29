import { BadgeCheck, ClipboardCheck, ShieldCheck, type LucideIcon } from 'lucide-react';

import { RevealOnScroll } from '@/components/motion';

interface SelloConfianza {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
}

/**
 * Franja de confianza del home (MEJORAS.md #101). Comunica tres garantías que YA
 * existen en el producto pero no se anunciaban en la portada: verificación KYC de
 * arrendadores (RENIEC/SUNAT), pagos con MercadoPago y moderación de propiedades.
 * Es contenido estático de marketing — sin datos remotos ni props.
 */
const SELLOS: SelloConfianza[] = [
  {
    icon: BadgeCheck,
    titulo: 'Arrendadores verificados',
    descripcion: 'Identidad validada con RENIEC y SUNAT antes de publicar.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Pago seguro con MercadoPago',
    descripcion: 'Cada transacción protegida de principio a fin.',
  },
  {
    icon: ClipboardCheck,
    titulo: 'Propiedades revisadas',
    descripcion: 'Nuestro equipo revisa cada cuarto antes de mostrarlo.',
  },
];

export function TrustBadges() {
  return (
    <section className="bg-background px-6 py-8 sm:px-12 md:py-10">
      <RevealOnScroll>
        <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border sm:p-6">
          {SELLOS.map(({ icon: Icon, titulo, descripcion }) => (
            <li key={titulo} className="flex items-center gap-4 sm:px-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight text-foreground">{titulo}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{descripcion}</p>
              </div>
            </li>
          ))}
        </ul>
      </RevealOnScroll>
    </section>
  );
}
