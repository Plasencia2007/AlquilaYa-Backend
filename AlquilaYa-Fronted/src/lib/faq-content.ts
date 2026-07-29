import { GraduationCap, Home, ShieldCheck, type LucideIcon } from 'lucide-react';

/**
 * Ítem 97/250 (MEJORAS.md): contenido único de preguntas frecuentes.
 *
 * Fuente de verdad compartida entre la FAQ pública (`/faq`, Accordion + JSON-LD
 * para Search) y el centro de ayuda privado del estudiante (`/student/ayuda`,
 * solo Accordion, filtrado a los grupos relevantes para estudiantes). Las
 * respuestas se guardan como texto plano para que lo visible y el JSON-LD de
 * la FAQ pública coincidan siempre (requisito de Google Search). El contenido
 * refleja el flujo real del producto (reserva SOLICITADA→APROBADA→PAGADA→
 * FINALIZADA, pago con Mercado Pago tras la aprobación, verificación OTP +
 * KYC, reputación por niveles).
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: FaqItem[];
}

export const FAQ_GRUPOS: FaqGroup[] = [
  {
    id: 'estudiantes',
    title: 'Para estudiantes',
    icon: GraduationCap,
    items: [
      {
        q: '¿Cómo reservo un cuarto?',
        a: 'Desde la ficha del cuarto envías una solicitud de reserva, que queda en estado "Solicitada". El arrendador la revisa y decide si la aprueba o la rechaza. Solicitar no tiene ningún costo: no se te cobra nada hasta que la reserva sea aprobada y decidas pagar.',
      },
      {
        q: '¿Cuándo y cómo pago mi cuarto?',
        a: 'El pago se hace con Mercado Pago y solo después de que el arrendador aprueba tu solicitud. Cuando tu reserva pasa a "Aprobada", en tu panel aparece el botón "Pagar ahora", que abre el checkout seguro de Mercado Pago. Al confirmarse el pago, la reserva pasa a "Confirmada".',
      },
      {
        q: '¿Qué pasa si el arrendador rechaza mi solicitud?',
        a: 'La reserva queda como "Rechazada" y el arrendador puede indicar un motivo, que verás en tu panel de reservas. Como el rechazo ocurre antes de cualquier pago, no se te cobra nada y puedes buscar y solicitar otro cuarto.',
      },
      {
        q: '¿Qué pasa si no pago a tiempo tras la aprobación?',
        a: 'Una reserva aprobada tiene un plazo para completar el pago. Si no pagas dentro de ese plazo, la reserva expira automáticamente y el cuarto se libera para que otros estudiantes puedan solicitarlo. Si aún te interesa, tendrás que volver a enviar la solicitud.',
      },
      {
        q: '¿Puedo cancelar y me devuelven el dinero?',
        a: 'El reembolso depende de la política de cancelación de cada propiedad (Flexible, Moderada o Estricta), que se muestra en la ficha del cuarto antes de reservar. Revísala con atención antes de pagar, porque define hasta cuándo puedes cancelar con reembolso.',
      },
      {
        q: '¿Cómo dejo una reseña?',
        a: 'Puedes calificar la propiedad (y, si quieres, al arrendador) cuando tu reserva está "Finalizada". La reseña de la propiedad valora cuatro aspectos —limpieza, ubicación, precio y trato— y la calificación general es el promedio de esos cuatro.',
      },
      {
        q: '¿Los cuartos están cerca de la UPeU?',
        a: 'Sí. AlquilaYa está enfocada en vivienda para estudiantes de la Universidad Peruana Unión (UPeU) en Lima. En la búsqueda puedes filtrar por zona, distancia, precio y servicios para encontrar un cuarto cerca de tu facultad.',
      },
    ],
  },
  {
    id: 'arrendadores',
    title: 'Para arrendadores',
    icon: Home,
    items: [
      {
        q: '¿Cómo publico un cuarto?',
        a: 'Regístrate como arrendador, completa la verificación de tu cuenta y publica tu propiedad con fotos, precio, ubicación en el mapa y los servicios que incluye. Cuando esté publicada, los estudiantes podrán enviarte solicitudes de reserva.',
      },
      {
        q: '¿Cómo apruebo o rechazo las solicitudes?',
        a: 'Las solicitudes llegan a tu panel de reservas. Puedes aprobarlas —lo que habilita el pago del estudiante— o rechazarlas indicando un motivo, que el estudiante verá en su panel.',
      },
      {
        q: '¿Cuándo recibo el pago y hay comisión?',
        a: 'El estudiante paga con Mercado Pago después de que apruebas su solicitud. AlquilaYa aplica una comisión de servicio sobre la operación; tú recibes el monto de la reserva. El detalle de tus ingresos y comisiones lo ves en la sección de finanzas de tu panel.',
      },
      {
        q: '¿Qué pasa si el estudiante no paga después de aprobar?',
        a: 'Si una reserva aprobada no se paga dentro del plazo establecido, expira automáticamente y el cuarto se libera para volver a recibir solicitudes. No tienes que hacer nada manualmente.',
      },
      {
        q: '¿Necesito RUC para publicar?',
        a: 'No es obligatorio. Puedes registrarte con tu DNI como persona natural. El RUC es opcional y está pensado para arrendadores que facturan como negocio.',
      },
      {
        q: '¿Puedo responder a las reseñas de mi propiedad?',
        a: 'Sí. Puedes responder públicamente las reseñas que los estudiantes dejan sobre tu propiedad, para dar contexto o agradecer los comentarios.',
      },
    ],
  },
  {
    id: 'cuenta',
    title: 'Cuenta, verificación y seguridad',
    icon: ShieldCheck,
    items: [
      {
        q: '¿Cómo verifico mi cuenta?',
        a: 'Al registrarte confirmas tu identidad con un código de un solo uso (OTP) que enviamos por WhatsApp (o por correo, según la configuración vigente). Además, para operar con normalidad debes completar la verificación de identidad (KYC) subiendo tus documentos.',
      },
      {
        q: '¿Qué documentos necesito para la verificación (KYC)?',
        a: 'Normalmente tu DNI por ambos lados (frente y reverso). A los estudiantes se les puede pedir el carné universitario y, en algunos casos, un recibo de servicios como comprobante. Los documentos (JPG, PNG o PDF) se revisan y pueden quedar aprobados o rechazados. También existe una validación instantánea del DNI contra RENIEC.',
      },
      {
        q: '¿Cómo funciona la reputación?',
        a: 'Cada usuario tiene un puntaje de reputación y un nivel —Bronce, Plata, Oro o Platino— que refleja su historial en la plataforma, como sus reservas y reseñas. Mientras mejor sea tu comportamiento (cumplir, pagar a tiempo, recibir buenas reseñas), mejor será tu nivel.',
      },
      {
        q: '¿Mis datos y mis pagos están seguros?',
        a: 'Los pagos se procesan a través de Mercado Pago, por lo que AlquilaYa no almacena los datos de tu tarjeta. Tus datos personales se tratan conforme a nuestra Política de Privacidad y a la Ley N.º 29733 de Protección de Datos Personales del Perú. Puedes revisar los detalles en las páginas de Términos y Privacidad.',
      },
    ],
  },
];
