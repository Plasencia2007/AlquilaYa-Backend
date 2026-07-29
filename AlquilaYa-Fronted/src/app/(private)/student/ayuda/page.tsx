'use client';

import { useState, type FormEvent } from 'react';
import { HelpCircle, Mail, Send } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { notify } from '@/lib/notify';
import { FAQ_GRUPOS } from '@/lib/faq-content';

/**
 * Ítem 250 (MEJORAS.md): centro de ayuda del panel privado del estudiante.
 *
 * Reutiliza el mismo contenido y componente Accordion que la FAQ pública
 * (`src/lib/faq-content.ts`), filtrado a los grupos relevantes para
 * estudiantes (se excluye "Para arrendadores"; "Cuenta, verificación y
 * seguridad" aplica a cualquier rol). El contenido no trae una
 * categorización más fina por rol, así que no se inventa una.
 *
 * El formulario de contacto usa `mailto:` en vez de una conversación de chat:
 * se revisó servicio-mensajeria y no existe ningún usuario/perfil "soporte"
 * en el sistema de mensajería, ni un endpoint de contacto genérico en el
 * backend. Se reutiliza el correo de soporte ya publicado en el Footer
 * público y en `/faq` (soporte@alquilaya.pe). No se agrega un botón de
 * WhatsApp: no hay ningún número de WhatsApp de "soporte" referenciado en el
 * proyecto (el único WhatsApp existente es el bot de envío de OTP de
 * servicio-notificaciones — whatsapp-web.js —, ligado al dispositivo que
 * escanea el QR, no un número fijo de atención); agregar uno sería inventarlo.
 */

const SUPPORT_EMAIL = 'soporte@alquilaya.pe';

const GRUPOS_ESTUDIANTE = FAQ_GRUPOS.filter((grupo) => grupo.id !== 'arrendadores');

export default function StudentAyudaPage() {
  const { usuario } = useAuth();
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');

  const puedeEnviar = asunto.trim().length > 0 && mensaje.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!puedeEnviar) {
      notify.warning('Completa el asunto y el mensaje');
      return;
    }
    const firma = [usuario?.nombre, usuario?.correo].filter(Boolean).join(' · ');
    const cuerpo = `${mensaje.trim()}\n\n—\n${firma}`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(asunto.trim())}&body=${encodeURIComponent(cuerpo)}`;
    window.location.href = url;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <HelpCircle className="size-3.5" aria-hidden />
          Centro de ayuda
        </span>
        <h1 className="text-h1">¿En qué te podemos ayudar?</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Resuelve tus dudas sobre reservas, pagos y tu cuenta. Si no encuentras tu respuesta,
          escríbenos abajo.
        </p>
      </header>

      <div className="space-y-10">
        {GRUPOS_ESTUDIANTE.map((grupo) => {
          const Icon = grupo.icon;
          return (
            <section key={grupo.id} aria-labelledby={`ayuda-${grupo.id}`}>
              <h2
                id={`ayuda-${grupo.id}`}
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

      <section className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2.5 font-headline text-lg font-bold tracking-tight text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mail className="size-4" aria-hidden />
          </span>
          Escríbenos
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Te responderemos desde {SUPPORT_EMAIL}.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ayuda-nombre" className="text-xs font-bold uppercase tracking-wider">
              Nombre
            </Label>
            <Input id="ayuda-nombre" value={usuario?.nombre ?? ''} disabled readOnly />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ayuda-asunto" className="text-xs font-bold uppercase tracking-wider">
              Asunto
            </Label>
            <Input
              id="ayuda-asunto"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Ej: Problema con el pago de mi reserva"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ayuda-mensaje" className="text-xs font-bold uppercase tracking-wider">
              Mensaje
            </Label>
            <Textarea
              id="ayuda-mensaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Cuéntanos con detalle qué necesitas…"
            />
            <p className="text-right text-[10px] text-muted-foreground">{mensaje.length}/1000</p>
          </div>

          <Button type="submit" disabled={!puedeEnviar}>
            <Send className="size-4" aria-hidden />
            Enviar por correo
          </Button>
        </form>
      </section>
    </div>
  );
}
