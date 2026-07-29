'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ChatWindow } from '@/components/student/chat-window';
import { CenteredSpinner } from '@/components/shared/centered-spinner';
import { ErrorState } from '@/components/shared/error-state';
import { useAuth } from '@/hooks/use-auth';
import { conversationService } from '@/services/conversation-service';
import { servicioPropiedades } from '@/services/property-service';
import { useUnreadMessagesStore } from '@/stores/unread-messages-store';

interface Props {
  params: Promise<{ id: string }>;
}

type EstadoConversacion = 'cargando' | 'ok' | 'no-encontrado' | 'error';

export default function StudentChatPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { usuario } = useAuth();
  const [contraparteNombre, setContraparteNombre] = useState<string | undefined>();
  const [propiedadTitulo, setPropiedadTitulo] = useState<string | undefined>();
  // Ítem 244: separado del estado de la conversación en sí — una vez que `obtener(id)`
  // resuelve OK, ChatWindow ya monta (carga mensajes/WS de inmediato); este flag solo
  // controla el skeleton del header mientras se resuelven nombre de arrendador y título.
  const [cargandoHeader, setCargandoHeader] = useState(true);
  const [estado, setEstado] = useState<EstadoConversacion>('cargando');
  const [intento, setIntento] = useState(0);
  const setTotalNoLeidos = useUnreadMessagesStore((s) => s.setTotal);

  // Ítem 201 (hallazgo): abrir la conversación la marca leída en el backend (endpoint ya
  // existía, `marcarLeida`, ya usado del lado arrendador) y refresca el badge del dashboard
  // — antes de este fix, "Mensajes" nunca bajaba aunque el estudiante ya hubiera leído todo.
  useEffect(() => {
    let cancelado = false;
    conversationService
      .marcarLeida(id)
      .then(() => conversationService.listarMias())
      .then((data) => {
        if (cancelado) return;
        setTotalNoLeidos(data.reduce((acc, c) => acc + (c.noLeidos || 0), 0));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [id, setTotalNoLeidos]);

  useEffect(() => {
    let cancelado = false;

    conversationService
      .obtener(id)
      .then(async (conv) => {
        if (cancelado) return;
        // La conversación existe y nos pertenece: ya se puede montar ChatWindow (mensajes/WS
        // arrancan de inmediato) mientras el header sigue en skeleton hasta resolver lo demás.
        setEstado('ok');

        if (conv.tipo === 'ROOMMATE') {
          // Sin arrendador ni propiedad: la contraparte es el otro estudiante de la pareja.
          const contraparteId =
            usuario?.perfilId === conv.estudianteId ? conv.estudiante2Id : conv.estudianteId;
          const companero = contraparteId
            ? await conversationService.obtenerInfoEstudiante(contraparteId).catch(() => null)
            : null;
          if (cancelado) return;
          setContraparteNombre(companero?.nombre ?? 'Compañero');
          setCargandoHeader(false);
          return;
        }

        const [propiedad, arrendador] = await Promise.all([
          servicioPropiedades.obtenerPorId(String(conv.propiedadId)).catch(() => null),
          conversationService.obtenerInfoArrendador(conv.arrendadorId as number).catch(() => null),
        ]);
        if (cancelado) return;
        if (propiedad) setPropiedadTitulo(propiedad.titulo);
        setContraparteNombre(arrendador?.nombre ?? 'Arrendador');
        setCargandoHeader(false);
      })
      .catch((err) => {
        if (cancelado) return;
        // Mismo patrón que student/history y groups/[id]: 404 = conversación inexistente o
        // ajena (no reintentable), cualquier otro error se trata como falla de red (reintentable).
        const status = (err as { response?: { status?: number } })?.response?.status;
        setEstado(status === 404 ? 'no-encontrado' : 'error');
      });

    return () => {
      cancelado = true;
    };
  }, [id, intento, usuario?.perfilId]);

  const reintentar = () => {
    setEstado('cargando');
    setCargandoHeader(true);
    setIntento((i) => i + 1);
  };

  if (estado === 'cargando') {
    return <CenteredSpinner className="py-24" />;
  }

  if (estado === 'no-encontrado') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState
          title="Conversación no encontrada"
          description="Es posible que esta conversación ya no exista o no te pertenezca."
          retryLabel="Volver a mensajes"
          onRetry={() => router.push('/student/messages')}
        />
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState
          title="No pudimos abrir esta conversación"
          description="Ocurrió un problema de conexión. Inténtalo de nuevo."
          retryLabel="Reintentar"
          onRetry={reintentar}
        />
      </div>
    );
  }

  return (
    <ChatWindow
      conversacionId={id}
      contraparteNombre={contraparteNombre}
      propiedadTitulo={propiedadTitulo}
      cargandoHeader={cargandoHeader}
    />
  );
}
