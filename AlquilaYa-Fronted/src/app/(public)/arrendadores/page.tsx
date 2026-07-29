import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { HOME_CTA_BANNER_IMAGE_URL } from '@/lib/home-assets';

import { IncomeCalculator } from './income-calculator';

export const metadata: Metadata = {
  title: 'Publica tu cuarto y genera ingresos',
  description:
    'Alquila tu cuarto o departamento a estudiantes UPeU con AlquilaYa. Recibes el 100% de tu alquiler, inquilinos verificados y cobros seguros con MercadoPago. Calcula tu ingreso estimado en segundos.',
  openGraph: {
    title: 'Publica tu cuarto y genera ingresos · AlquilaYa',
    description:
      'Recibes el 100% de tu alquiler, inquilinos verificados y cobros seguros con MercadoPago. Calcula tu ingreso estimado.',
  },
};

/** El registro lee `?rol=arrendador`: preselecciona el rol y salta el paso de elegir rol. */
const REGISTRO_HREF = '/register?rol=arrendador';

const VALOR = [
  {
    icon: TrendingUp,
    title: 'Recibes el 100% de tu alquiler',
    body: 'La comisión de servicio la asume el estudiante, no tú. Es transparente y depende de la zona: siempre se muestra por adelantado, sin sorpresas ni descuentos a tu bolsillo.',
  },
  {
    icon: ShieldCheck,
    title: 'Inquilinos verificados',
    body: 'Cada estudiante se registra con su identidad (DNI), su universidad y un teléfono confirmado por WhatsApp. Sabes a quién le alquilas antes de aprobar la reserva.',
  },
  {
    icon: CreditCard,
    title: 'Cobros seguros con MercadoPago',
    body: 'El estudiante paga en línea con MercadoPago. Nada de efectivo ni de perseguir el pago: la reserva se confirma sola cuando el dinero entra.',
  },
];

const PASOS = [
  {
    n: '01',
    title: 'Publica tu cuarto',
    body: 'Fotos, precio y ubicación en el mapa. Te sugerimos un precio según avisos parecidos de tu zona.',
  },
  {
    n: '02',
    title: 'Recibe solicitudes',
    body: 'Los estudiantes verificados solicitan tu cuarto. Revisas su perfil y apruebas a quien quieras.',
  },
  {
    n: '03',
    title: 'Cobra y listo',
    body: 'El estudiante paga por MercadoPago y la reserva queda confirmada. Tú recibes el alquiler íntegro.',
  },
];

export default function ArrendadoresPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden rounded-b-[2rem] px-6 sm:px-12 md:rounded-b-[3rem]">
        <div className="absolute inset-0">
          <Image
            fill
            priority
            sizes="100vw"
            alt="Arrendador gestionando sus cuartos desde el celular"
            src={HOME_CTA_BANNER_IMAGE_URL}
            className="object-cover brightness-[0.55]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-3xl py-28 text-white">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-px w-10 bg-brand-400" aria-hidden />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-200 backdrop-blur-sm">
              <Sparkles className="size-3" aria-hidden /> Para arrendadores
            </span>
          </div>

          <h1 className="text-display text-white drop-shadow-lg">
            Convierte tu cuarto en
            <br />
            <span className="text-brand-400">ingresos constantes.</span>
          </h1>

          <p className="mt-8 max-w-xl text-base font-medium leading-relaxed text-white/90 drop-shadow sm:text-lg">
            Alquila a estudiantes de la UPeU con inquilinos verificados, cobros por
            MercadoPago y el 100% de tu alquiler para ti. Sin comisiones que te descuenten.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-14 w-full rounded-full px-10 text-sm font-bold shadow-xl sm:w-auto"
            >
              <Link href={REGISTRO_HREF}>
                Publicar mi cuarto
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 w-full rounded-full border-white/40 bg-white/10 px-10 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:w-auto"
            >
              <Link href="#calculadora">Calcular mi ingreso</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Propuesta de valor ── */}
      <section className="bg-background px-6 py-16 sm:px-12 md:py-24">
        <header className="mb-10 max-w-2xl md:mb-14">
          <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
            <span className="h-px w-8 bg-primary" aria-hidden />
            Por qué AlquilaYa
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Alquilar sin dolores de cabeza
          </h2>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Tú pones el cuarto; nosotros ponemos los inquilinos verificados, los cobros y la
            gestión.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {VALOR.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex flex-col rounded-3xl border border-border bg-card p-6 md:p-8"
            >
              <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-7" aria-hidden />
              </div>
              <h3 className="mb-2 text-lg font-black tracking-tight text-foreground">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Calculadora ── */}
      <section
        id="calculadora"
        className="scroll-mt-24 bg-card px-6 py-16 sm:px-12 md:py-24"
      >
        <header className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
            <span className="h-px w-8 bg-primary" aria-hidden />
            Calculadora de ingresos
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
            ¿Cuánto puedes ganar?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Con precios reales de avisos publicados cerca de la universidad. Sin registrarte.
          </p>
        </header>

        <IncomeCalculator />
      </section>

      {/* ── Cómo funciona ── */}
      <section className="bg-background px-6 py-16 sm:px-12 md:py-24">
        <header className="mb-10 max-w-2xl md:mb-14">
          <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
            <span className="h-px w-8 bg-primary" aria-hidden />
            En 3 pasos
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Cómo funciona
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PASOS.map(({ n, title, body }) => (
            <div key={n} className="relative rounded-3xl border border-border bg-card p-6 md:p-8">
              <span className="font-headline text-4xl font-black text-primary/25">{n}</span>
              <h3 className="mb-2 mt-2 text-lg font-black tracking-tight text-foreground">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-foreground/80">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden /> Publicar es
            gratis
          </li>
          <li className="flex items-center gap-2">
            <BadgeCheck className="size-4 shrink-0 text-primary" aria-hidden /> Tú apruebas a
            cada inquilino
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden /> Sin
            permanencia ni exclusividad
          </li>
        </ul>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 pb-20 sm:px-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground md:py-20">
          <h2 className="max-w-2xl text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Empieza a alquilar hoy mismo
          </h2>
          <p className="max-w-xl text-sm leading-relaxed opacity-90 md:text-base">
            Crea tu cuenta de arrendador, publica tu primer cuarto y recibe solicitudes de
            estudiantes verificados.
          </p>
          <Button
            asChild
            size="lg"
            className="h-14 rounded-full bg-white px-10 text-sm font-bold text-primary shadow-xl hover:bg-white/90"
          >
            <Link href={REGISTRO_HREF}>
              Publicar mi cuarto
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
