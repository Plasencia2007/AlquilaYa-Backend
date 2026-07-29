import Link from 'next/link';
import type { Metadata } from 'next';
import { HelpCircle } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FAQ_GRUPOS as GRUPOS } from '@/lib/faq-content';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes · AlquilaYa',
  description:
    'Resolvemos las dudas más comunes sobre cómo reservar y pagar un cuarto, qué pasa si te rechazan la reserva, cómo se verifica tu cuenta y cómo funciona la reputación en AlquilaYa.',
};

/**
 * Ítem 97 (MEJORAS.md): FAQ con Accordion agrupada por rol + JSON-LD FAQPage.
 *
 * El contenido (preguntas/respuestas por grupo) vive en `src/lib/faq-content.ts`
 * — única fuente de verdad compartida con el centro de ayuda privado del
 * estudiante (`/student/ayuda`, ítem 250). Aquí se pinta en el Accordion Y se
 * usa para construir el JSON-LD, de modo que el contenido estructurado que ve
 * Google coincide siempre con el visible (requisito de Search).
 */

function buildFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GRUPOS.flatMap((grupo) =>
      grupo.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    ),
  };
}

export default function FaqPage() {
  const jsonLd = buildFaqJsonLd();

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-28 sm:px-8">
      { }
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <HelpCircle className="size-3.5" aria-hidden />
          Centro de ayuda
        </span>
        <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Preguntas frecuentes
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Todo lo que necesitas saber para reservar, pagar y publicar cuartos cerca de la UPeU. ¿No
          encuentras tu respuesta? Escríbenos a{' '}
          <a href="mailto:soporte@alquilaya.pe" className="font-medium text-primary hover:underline">
            soporte@alquilaya.pe
          </a>
          .
        </p>
      </header>

      <div className="space-y-12">
        {GRUPOS.map((grupo) => {
          const Icon = grupo.icon;
          return (
            <section key={grupo.id} aria-labelledby={`faq-${grupo.id}`}>
              <h2
                id={`faq-${grupo.id}`}
                className="mb-3 flex items-center gap-2.5 font-headline text-lg font-bold tracking-tight text-foreground"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                {grupo.title}
              </h2>
              <Accordion
                type="single"
                collapsible
                className="rounded-xl border border-border bg-card px-4"
              >
                {grupo.items.map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={`${grupo.id}-${i}`}
                    className="border-border last:border-b-0"
                  >
                    <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          );
        })}
      </div>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        Consulta también nuestros{' '}
        <Link href="/terminos" className="font-medium text-primary hover:underline">
          Términos y condiciones
        </Link>{' '}
        y la{' '}
        <Link href="/privacidad" className="font-medium text-primary hover:underline">
          Política de privacidad
        </Link>
        .
      </p>
    </main>
  );
}
