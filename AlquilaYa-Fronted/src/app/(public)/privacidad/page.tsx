import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de privacidad · AlquilaYa',
  description:
    'Política de privacidad de AlquilaYa: qué datos personales recopilamos (DNI, RUC, teléfono, documentos KYC, imágenes), con qué fin, con qué terceros los compartimos y cómo ejercer tus derechos bajo la Ley N.º 29733 del Perú.',
};

const ULTIMA_ACTUALIZACION = '9 de julio de 2026';
const VERSION = '1.0';

/**
 * Ítem 98 (MEJORAS.md): Política de privacidad como página estática versionada.
 *
 * IMPORTANTE: BORRADOR para un proyecto universitario, NO revisado legalmente.
 * Describe el tratamiento real de datos según el producto (DNI, RUC, teléfono,
 * documentos KYC, imágenes; Mercado Pago como procesador de pagos, Cloudinary
 * como almacenamiento de imágenes, WhatsApp para OTP, Google para login, RENIEC
 * para validación de identidad) y los derechos ARCO de la Ley N.º 29733. Debe
 * ser revisado por un profesional antes de un lanzamiento real.
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

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-28 sm:px-8">
      <header className="border-b border-border pb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden />
          Legal
        </span>
        <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Política de privacidad
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
          documento describe el tratamiento de datos previsto para AlquilaYa en el marco de un
          proyecto universitario y aún no ha sido revisado por un profesional del derecho. No debe
          considerarse asesoría legal ni una garantía de cumplimiento normativo. Será revisado y
          ajustado antes de cualquier lanzamiento real.
        </p>
      </div>

      <div className="mt-10 space-y-9">
        <LegalSection id="responsable" n={1} title="Responsable del tratamiento">
          <p>
            AlquilaYa es responsable del tratamiento de los datos personales recopilados a través de
            la Plataforma. El tratamiento se realiza conforme a la Ley N.º 29733, Ley de Protección de
            Datos Personales del Perú, y su reglamento. Para consultas sobre privacidad puedes
            escribirnos a{' '}
            <a href="mailto:privacidad@alquilaya.pe" className="font-medium text-primary hover:underline">
              privacidad@alquilaya.pe
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection id="datos" n={2} title="Qué datos recopilamos">
          <p>Según tu rol y tu uso de la Plataforma, podemos recopilar:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="font-semibold text-foreground">Datos de identidad:</strong> nombre,
              apellidos, número de DNI y fecha de nacimiento.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Datos de contacto:</strong> correo
              electrónico y número de teléfono.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Datos de cuenta:</strong> contraseña
              (almacenada de forma cifrada) e información de inicio de sesión con Google, si eliges esa
              opción.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Datos de estudiante:</strong>
              {' '}universidad, código de estudiante, carrera y ciclo.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Datos de arrendador:</strong> RUC (si
              aplica), nombre comercial y la dirección y ubicación (coordenadas) de los inmuebles.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Documentos de verificación (KYC):</strong>
              {' '}imágenes o archivos de tu DNI, carné universitario u otros comprobantes que subas
              para validar tu identidad.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Contenido que publicas:</strong> foto
              de perfil, fotos y descripciones de propiedades, reseñas y mensajes.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Datos de uso y sesión:</strong>
              {' '}información técnica sobre el dispositivo y la sesión necesaria para la seguridad de tu
              cuenta.
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="finalidad" n={3} title="Con qué finalidad los usamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>crear y gestionar tu cuenta y verificar tu identidad;</li>
            <li>permitir la búsqueda, publicación, reserva y contacto entre estudiantes y arrendadores;</li>
            <li>procesar los pagos y las comisiones de las reservas;</li>
            <li>enviar códigos de verificación y notificaciones relacionadas con el servicio;</li>
            <li>calcular la reputación, mostrar reseñas y prevenir fraudes o usos indebidos;</li>
            <li>cumplir obligaciones legales y atender requerimientos de autoridades competentes.</li>
          </ul>
        </LegalSection>

        <LegalSection id="base" n={4} title="Base para el tratamiento">
          <p>
            Tratamos tus datos sobre la base de tu consentimiento (que otorgas al registrarte y usar
            la Plataforma), la ejecución de la relación que nos vincula y el cumplimiento de
            obligaciones legales. Puedes retirar tu consentimiento en cualquier momento, sin efectos
            retroactivos, ejerciendo los derechos descritos más abajo.
          </p>
        </LegalSection>

        <LegalSection id="terceros" n={5} title="Con quién compartimos tus datos">
          <p>
            No vendemos tus datos personales. Los compartimos únicamente con proveedores que nos
            ayudan a operar la Plataforma, en la medida necesaria para prestar el servicio:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="font-semibold text-foreground">Mercado Pago</strong> — procesa los
              pagos de las reservas. Los datos de tu medio de pago los gestiona directamente Mercado
              Pago; AlquilaYa no almacena datos de tarjetas.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Cloudinary</strong> — almacena y
              entrega las imágenes que se suben a la Plataforma (por ejemplo, fotos de propiedades y
              de perfil).
            </li>
            <li>
              <strong className="font-semibold text-foreground">WhatsApp</strong> — utilizado para el
              envío de códigos de verificación (OTP) y notificaciones.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Google</strong> — si eliges iniciar
              sesión con tu cuenta de Google.
            </li>
            <li>
              <strong className="font-semibold text-foreground">RENIEC</strong> — para validar que los
              datos de tu DNI corresponden a tu identidad.
            </li>
          </ul>
          <p>
            Asimismo, cierta información de perfil (como tu nombre y reputación) es visible para la
            otra parte de una reserva a fin de generar confianza en la transacción.
          </p>
        </LegalSection>

        <LegalSection id="conservacion" n={6} title="Por cuánto tiempo conservamos tus datos">
          <p>
            Conservamos tus datos mientras tu cuenta esté activa y durante el tiempo necesario para
            cumplir las finalidades descritas, atender reclamos y cumplir obligaciones legales,
            contables o tributarias. Luego se eliminan o anonimizan de forma segura.
          </p>
        </LegalSection>

        <LegalSection id="seguridad" n={7} title="Seguridad de la información">
          <p>
            Aplicamos medidas técnicas y organizativas razonables para proteger tus datos, como el
            cifrado de contraseñas y el uso de tokens de sesión seguros. Ningún sistema es
            infalible, por lo que no podemos garantizar una seguridad absoluta, pero trabajamos para
            reducir los riesgos.
          </p>
        </LegalSection>

        <LegalSection id="cookies" n={8} title="Cookies y tecnologías similares">
          <p>
            Utilizamos cookies estrictamente necesarias para mantener tu sesión iniciada y para el
            funcionamiento y la seguridad de la Plataforma. Sin ellas, servicios básicos como el
            inicio de sesión no funcionarían correctamente.
          </p>
        </LegalSection>

        <LegalSection id="derechos" n={9} title="Tus derechos (ARCO)">
          <p>
            De acuerdo con la Ley N.º 29733, tienes derecho a acceder a tus datos, rectificarlos
            cuando sean inexactos, cancelarlos (solicitar su supresión) y oponerte a determinados
            tratamientos. También puedes retirar tu consentimiento. Para ejercer estos derechos,
            escríbenos a{' '}
            <a href="mailto:privacidad@alquilaya.pe" className="font-medium text-primary hover:underline">
              privacidad@alquilaya.pe
            </a>
            . Responderemos tu solicitud en los plazos que establece la normativa.
          </p>
        </LegalSection>

        <LegalSection id="menores" n={10} title="Menores de edad">
          <p>
            La Plataforma está dirigida a personas mayores de edad. Si detectamos que se ha creado una
            cuenta con datos de un menor sin la autorización correspondiente, procederemos a
            eliminarla.
          </p>
        </LegalSection>

        <LegalSection id="transferencias" n={11} title="Transferencias internacionales">
          <p>
            Algunos de nuestros proveedores (por ejemplo, de pagos, almacenamiento de imágenes o
            autenticación) pueden procesar datos en servidores ubicados fuera del Perú. En esos
            casos, procuramos que existan garantías adecuadas para la protección de tu información.
          </p>
        </LegalSection>

        <LegalSection id="cambios" n={12} title="Cambios a esta política">
          <p>
            Podemos actualizar esta Política para reflejar cambios en el servicio o en la normativa.
            Publicaremos la versión vigente en esta página y actualizaremos la fecha indicada al
            inicio.
          </p>
        </LegalSection>

        <LegalSection id="autoridad" n={13} title="Autoridad de control">
          <p>
            Si consideras que el tratamiento de tus datos no se ajusta a la normativa, puedes acudir a
            la Autoridad Nacional de Protección de Datos Personales del Perú. Antes, te agradecemos
            contactarnos para intentar resolver tu inquietud directamente. Consulta también nuestros{' '}
            <Link href="/terminos" className="font-medium text-primary hover:underline">
              Términos y condiciones
            </Link>
            .
          </p>
        </LegalSection>
      </div>
    </main>
  );
}
