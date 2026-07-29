import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos y condiciones · AlquilaYa',
  description:
    'Términos y condiciones de uso de AlquilaYa: plataforma que conecta a estudiantes de la UPeU con arrendadores de cuartos en Lima. Reservas, pagos con Mercado Pago, cuentas y responsabilidades.',
};

const ULTIMA_ACTUALIZACION = '9 de julio de 2026';
const VERSION = '1.0';

/**
 * Ítem 98 (MEJORAS.md): Términos y condiciones como página estática versionada.
 *
 * IMPORTANTE: es un BORRADOR redactado como referencia interna para un proyecto
 * universitario, NO un documento con validez legal revisada. Antes de cualquier
 * lanzamiento real debe ser revisado por un profesional del derecho. El aviso de
 * borrador se muestra de forma visible al inicio de la página.
 */

function LegalSection({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28">
      <h2
        id={`${id}-h`}
        className="font-headline text-lg font-bold tracking-tight text-foreground"
      >
        {n}. {title}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-28 sm:px-8">
      <header className="border-b border-border pb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <FileText className="size-3.5" aria-hidden />
          Legal
        </span>
        <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Términos y condiciones
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Versión {VERSION} · Última actualización: {ULTIMA_ACTUALIZACION}
        </p>
      </header>

      {/* Aviso de borrador — requerido: no afirmamos cumplimiento legal garantizado. */}
      <div
        role="note"
        className="mt-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-light p-4 text-sm text-warning-foreground"
      >
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <p className="leading-relaxed">
          <strong className="font-semibold">Borrador pendiente de revisión legal.</strong> Este
          documento es un borrador elaborado en el marco de un proyecto universitario y aún no ha
          sido revisado por un profesional del derecho. No debe considerarse un contrato definitivo
          ni una asesoría legal. Antes de un lanzamiento comercial real, será revisado y ajustado
          para cumplir plenamente con la normativa aplicable.
        </p>
      </div>

      <div className="mt-10 space-y-9">
        <LegalSection id="aceptacion" n={1} title="Aceptación de los términos">
          <p>
            Al crear una cuenta o utilizar AlquilaYa (la &laquo;Plataforma&raquo;), aceptas estos
            Términos y condiciones y nuestra{' '}
            <Link href="/privacidad" className="font-medium text-primary hover:underline">
              Política de privacidad
            </Link>
            . Si no estás de acuerdo con ellos, no debes usar la Plataforma.
          </p>
        </LegalSection>

        <LegalSection id="servicio" n={2} title="Descripción del servicio">
          <p>
            AlquilaYa es una plataforma tecnológica que conecta a estudiantes de la Universidad
            Peruana Unión (UPeU) que buscan vivienda con arrendadores que ofrecen cuartos y
            departamentos, principalmente en zonas cercanas al campus en Lima, Perú.
          </p>
          <p>
            AlquilaYa actúa como intermediario que facilita el contacto, la reserva y el pago. No es
            propietaria de los inmuebles publicados ni es parte del contrato de arrendamiento, que se
            celebra directamente entre el estudiante y el arrendador.
          </p>
        </LegalSection>

        <LegalSection id="cuenta" n={3} title="Registro, cuenta y verificación">
          <p>
            Para usar las funciones principales debes registrarte y proporcionar información veraz,
            completa y actualizada (nombre, documento de identidad, correo y teléfono, entre otros).
            Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad
            realizada desde tu cuenta.
          </p>
          <p>
            La Plataforma verifica las cuentas mediante un código de un solo uso (OTP) enviado por
            WhatsApp o correo, y mediante la validación de documentos de identidad (KYC). Puedes ser
            requerido a completar dicha verificación para reservar, publicar o recibir pagos.
            Registrar información falsa o suplantar a terceros puede derivar en la suspensión de la
            cuenta.
          </p>
        </LegalSection>

        <LegalSection id="estudiantes" n={4} title="Obligaciones de los estudiantes">
          <p>
            Como estudiante, te comprometes a proporcionar información veraz, a usar la Plataforma de
            buena fe, a respetar las reglas de cada propiedad y a cumplir los compromisos de pago y
            estadía asumidos con el arrendador. Las reseñas que publiques deben ser honestas y basarse
            en tu experiencia real.
          </p>
        </LegalSection>

        <LegalSection id="arrendadores" n={5} title="Obligaciones de los arrendadores">
          <p>
            Como arrendador, declaras que estás facultado para ofrecer en alquiler los inmuebles que
            publicas y que la información, precios, fotos y condiciones son veraces y están
            actualizados. Te comprometes a atender las solicitudes de reserva de forma diligente y a
            respetar las condiciones y políticas de cancelación que hayas publicado.
          </p>
        </LegalSection>

        <LegalSection id="reservas" n={6} title="Reservas y pagos">
          <p>
            El flujo de reserva es el siguiente: el estudiante envía una solicitud, el arrendador la
            aprueba o la rechaza, y, una vez aprobada, el estudiante realiza el pago. La reserva se
            confirma únicamente cuando el pago se ha completado.
          </p>
          <p>
            Los pagos se procesan a través de <strong className="font-semibold">Mercado Pago</strong>,
            proveedor externo de servicios de pago. AlquilaYa no almacena los datos de tarjetas. Sobre
            cada operación, la Plataforma puede aplicar una comisión de servicio, que se refleja en el
            monto correspondiente.
          </p>
          <p>
            Una reserva aprobada tiene un plazo para ser pagada. Si no se completa el pago dentro de
            ese plazo, la reserva expira automáticamente y el inmueble vuelve a estar disponible para
            otros estudiantes.
          </p>
        </LegalSection>

        <LegalSection id="cancelaciones" n={7} title="Cancelaciones y reembolsos">
          <p>
            Cada propiedad define su política de cancelación (por ejemplo, Flexible, Moderada o
            Estricta), que se muestra en la ficha del inmueble antes de reservar. Las condiciones de
            reembolso dependen de dicha política y del momento en que se solicite la cancelación. Es
            responsabilidad del estudiante revisar la política aplicable antes de pagar.
          </p>
        </LegalSection>

        <LegalSection id="contenido" n={8} title="Contenido de los usuarios y reseñas">
          <p>
            Los usuarios son responsables del contenido que publican (fotos, descripciones, reseñas y
            respuestas). Al publicar contenido, otorgas a AlquilaYa una licencia no exclusiva para
            mostrarlo dentro de la Plataforma con la finalidad de prestar el servicio. Las reseñas
            solo pueden ser dejadas por estudiantes respecto de reservas finalizadas y deben ser
            veraces.
          </p>
        </LegalSection>

        <LegalSection id="conducta" n={9} title="Conductas prohibidas">
          <p>Al usar la Plataforma te comprometes a no:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>publicar información falsa, engañosa o que suplante la identidad de un tercero;</li>
            <li>intentar realizar pagos por fuera de la Plataforma para evadir comisiones o controles;</li>
            <li>publicar contenido ilegal, ofensivo, discriminatorio o que infrinja derechos de terceros;</li>
            <li>vulnerar la seguridad de la Plataforma o interferir con su funcionamiento.</li>
          </ul>
        </LegalSection>

        <LegalSection id="responsabilidad" n={10} title="Limitación de responsabilidad">
          <p>
            AlquilaYa facilita el contacto y la transacción entre estudiantes y arrendadores, pero no
            garantiza la disponibilidad, el estado ni la idoneidad de los inmuebles, ni el
            comportamiento de los usuarios. La relación de arrendamiento y el cumplimiento del
            contrato son responsabilidad exclusiva de las partes. En la máxima medida permitida por la
            ley, AlquilaYa no será responsable por daños indirectos derivados del uso de la Plataforma.
          </p>
        </LegalSection>

        <LegalSection id="terminacion" n={11} title="Suspensión y terminación">
          <p>
            Podemos suspender o cancelar cuentas que incumplan estos Términos, que registren
            información fraudulenta o que representen un riesgo para otros usuarios o para la
            Plataforma. También puedes solicitar la eliminación de tu cuenta en cualquier momento.
          </p>
        </LegalSection>

        <LegalSection id="datos" n={12} title="Protección de datos personales">
          <p>
            El tratamiento de tus datos personales se rige por nuestra{' '}
            <Link href="/privacidad" className="font-medium text-primary hover:underline">
              Política de privacidad
            </Link>{' '}
            y por la Ley N.º 29733, Ley de Protección de Datos Personales del Perú, y su reglamento.
          </p>
        </LegalSection>

        <LegalSection id="modificaciones" n={13} title="Modificaciones de los términos">
          <p>
            Podemos actualizar estos Términos para reflejar cambios en el servicio o en la normativa.
            Cuando lo hagamos, actualizaremos la fecha indicada al inicio. El uso continuado de la
            Plataforma tras una modificación implica la aceptación de la versión vigente.
          </p>
        </LegalSection>

        <LegalSection id="ley" n={14} title="Ley aplicable y jurisdicción">
          <p>
            Estos Términos se rigen por las leyes de la República del Perú. Cualquier controversia se
            someterá a los jueces y tribunales competentes de Lima, sin perjuicio de los derechos que
            correspondan al usuario como consumidor.
          </p>
        </LegalSection>

        <LegalSection id="contacto" n={15} title="Contacto">
          <p>
            Para cualquier consulta sobre estos Términos, escríbenos a{' '}
            <a href="mailto:soporte@alquilaya.pe" className="font-medium text-primary hover:underline">
              soporte@alquilaya.pe
            </a>
            .
          </p>
        </LegalSection>
      </div>
    </main>
  );
}
