import { CalendarCheck, CheckCircle2, CreditCard, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { RevealOnScroll, Stagger } from '@/components/motion';

interface Paso {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  /** Estado real de la reserva tras ese paso (backend: SOLICITADA/APROBADA/PAGADA). */
  estado?: string;
}

// Microcopy del flujo REAL: buscar → solicitar (SOLICITADA) → el arrendador
// aprueba (APROBADA) → pagas con MercadoPago (PAGADA) → te mudas.
const PASOS: Paso[] = [
  {
    icon: Search,
    titulo: 'Busca y compara',
    descripcion:
      'Filtra por zona, precio y servicios para encontrar cuartos verificados cerca de tu facultad.',
  },
  {
    icon: CalendarCheck,
    titulo: 'Solicita tu reserva',
    descripcion:
      'Envías la solicitud del cuarto que te gustó y queda a la espera de que el arrendador la revise.',
    estado: 'Solicitada',
  },
  {
    icon: CheckCircle2,
    titulo: 'El arrendador aprueba',
    descripcion:
      'Revisa tu perfil y confirma la reserva. Recién ahí se habilita el pago: nada se cobra antes.',
    estado: 'Aprobada',
  },
  {
    icon: CreditCard,
    titulo: 'Paga y múdate',
    descripcion:
      'Pagas de forma segura con MercadoPago y coordinas la entrega de llaves para mudarte.',
    estado: 'Pagada',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-background px-6 py-16 sm:px-12 md:py-24">
      <RevealOnScroll className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
        <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
          <span className="h-px w-8 bg-primary" aria-hidden />
          Cómo funciona
          <span className="h-px w-8 bg-primary" aria-hidden />
        </span>
        <h2 className="mb-3 text-3xl font-extrabold leading-tight tracking-tighter text-foreground md:text-5xl">
          De la búsqueda a las llaves en 4 pasos
        </h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Sin comisiones ocultas: reservas, el arrendador aprueba y recién entonces pagas seguro
          con MercadoPago.
        </p>
      </RevealOnScroll>

      <Stagger className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PASOS.map(({ icon: Icon, titulo, descripcion, estado }, i) => (
          <div
            key={titulo}
            className="relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <span
              className="absolute right-5 top-4 text-4xl font-black leading-none text-primary/10"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-6" aria-hidden />
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">{titulo}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{descripcion}</p>
            {estado ? (
              <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                {estado}
              </span>
            ) : null}
          </div>
        ))}
      </Stagger>
    </section>
  );
}
