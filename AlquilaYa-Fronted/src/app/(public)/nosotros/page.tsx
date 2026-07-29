import Link from 'next/link';
import type { Metadata } from 'next';
import { MapPin, ShieldCheck, Sparkles, Users, Wallet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sobre nosotros · AlquilaYa',
  description:
    'AlquilaYa nació para que los estudiantes de la UPeU encuentren vivienda accesible, verificada y cercana al campus. Conoce nuestra misión, el problema que resolvemos y la historia del proyecto.',
};

/**
 * Ítem 96 (MEJORAS.md): página "Nosotros" con misión, problema y línea de
 * tiempo. La sección de equipo se deja como PLACEHOLDER a propósito: no
 * disponemos de fotos ni de los nombres reales del equipo, y no se inventan
 * (ver comentario en la sección correspondiente más abajo).
 */

const VALORES = [
  {
    icon: Wallet,
    title: 'Accesible',
    text: 'Precios claros, sin cargos ocultos. Solo pagas cuando el arrendador aprueba tu reserva.',
  },
  {
    icon: ShieldCheck,
    title: 'Verificado',
    text: 'Identidad validada con OTP y documentos (KYC), y validación de DNI contra RENIEC.',
  },
  {
    icon: MapPin,
    title: 'Cercano',
    text: 'Cuartos y departamentos a minutos del campus de la UPeU, filtrables por zona y distancia.',
  },
];

const TIMELINE = [
  {
    year: '2025',
    title: 'El problema',
    text: 'Cada ciclo, cientos de estudiantes de la UPeU buscan cuarto entre grupos de WhatsApp, avisos sueltos y visitas a ciegas, sin garantías sobre el arrendador ni sobre el pago.',
  },
  {
    year: '2025',
    title: 'La idea',
    text: 'Reunir la oferta de vivienda estudiantil cercana al campus en un solo lugar, con perfiles verificados, reseñas reales y un flujo de reserva ordenado.',
  },
  {
    year: '2026',
    title: 'La plataforma',
    text: 'AlquilaYa integra búsqueda con filtros, reservas con estados claros, pagos con Mercado Pago y verificación de identidad, para que reservar un cuarto sea tan simple como comprar en línea.',
  },
  {
    year: 'Hoy',
    title: 'Lo que viene',
    text: 'Seguimos sumando cuartos verificados cerca de la UPeU y mejorando la experiencia tanto para estudiantes como para arrendadores.',
  },
];

export default function NosotrosPage() {
  return (
    <main className="pb-24 pt-28">
      {/* Hero / misión */}
      <section className="mx-auto max-w-3xl px-6 text-center sm:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden />
          Nuestra misión
        </span>
        <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Vivienda estudiantil accesible, cerca de la UPeU
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Creemos que encontrar dónde vivir durante la universidad no debería ser una fuente de
          estrés. AlquilaYa conecta a estudiantes de la Universidad Peruana Unión con arrendadores
          verificados, para que reservar un cuarto seguro y cercano al campus sea rápido, claro y
          confiable.
        </p>
      </section>

      {/* Valores */}
      <section className="mx-auto mt-16 max-w-5xl px-6 sm:px-8" aria-label="Nuestros valores">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {VALORES.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="rounded-xl border border-border bg-card p-6">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-headline text-base font-bold text-foreground">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* El problema que resolvemos */}
      <section className="mx-auto mt-20 max-w-3xl px-6 sm:px-8" aria-labelledby="problema">
        <h2 id="problema" className="font-headline text-2xl font-bold tracking-tight text-foreground">
          El problema que resolvemos
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            La búsqueda de cuarto para estudiantes en Lima sigue ocurriendo en canales informales:
            grupos de WhatsApp, carteles y recomendaciones de boca en boca. Eso deja a los
            estudiantes sin forma de verificar quién es el arrendador, sin reseñas de otros
            inquilinos y sin un método de pago que dé garantías a ambas partes.
          </p>
          <p>
            AlquilaYa ordena ese proceso: los arrendadores publican propiedades verificadas, los
            estudiantes reservan con un flujo transparente (solicitud, aprobación y pago) y el dinero
            se mueve a través de Mercado Pago. Todo con perfiles cuya identidad ha sido validada.
          </p>
        </div>
      </section>

      {/* Línea de tiempo */}
      <section className="mx-auto mt-20 max-w-3xl px-6 sm:px-8" aria-labelledby="historia">
        <h2 id="historia" className="font-headline text-2xl font-bold tracking-tight text-foreground">
          La historia del proyecto
        </h2>
        <ol className="mt-6 space-y-6 border-l border-border pl-6">
          {TIMELINE.map((step) => (
            <li key={step.title} className="relative">
              <span
                className="absolute -left-[1.9rem] top-1 flex size-3 items-center justify-center rounded-full bg-primary ring-4 ring-background"
                aria-hidden
              />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {step.year}
              </span>
              <h3 className="mt-1 font-headline text-base font-bold text-foreground">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/*
        Sección de equipo — PLACEHOLDER intencional (ítem 96 menciona "fotos del
        equipo"). No se incluyen fotos ni nombres porque no disponemos de esos
        assets ni de la identidad real del equipo, y no se inventan. Cuando el
        proyecto tenga los datos definitivos, reemplazar este bloque por las
        tarjetas del equipo (foto + nombre + rol).
        TODO(equipo): agregar integrantes reales con foto, nombre y rol.
      */}
      <section className="mx-auto mt-20 max-w-3xl px-6 sm:px-8" aria-labelledby="equipo">
        <h2 id="equipo" className="font-headline text-2xl font-bold tracking-tight text-foreground">
          El equipo
        </h2>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-6">
          <Users className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">
            AlquilaYa es un proyecto desarrollado por y para la comunidad UPeU. Pronto compartiremos
            aquí a las personas detrás de la plataforma.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-20 max-w-3xl px-6 text-center sm:px-8">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="font-headline text-xl font-bold tracking-tight text-foreground">
            ¿Buscas tu próximo cuarto?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Explora los cuartos disponibles cerca de la UPeU o publica el tuyo.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/search"
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
            >
              Buscar cuartos
            </Link>
            <Link
              href="/arrendadores"
              className="rounded-full border border-border bg-background px-6 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
            >
              Publicar mi cuarto
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
