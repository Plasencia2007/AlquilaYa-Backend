'use client';

import { use, useEffect, useState } from 'react';

import { ChatWindow } from '@/components/student/chat-window';
import { conversationService } from '@/services/conversation-service';
import { servicioPropiedades } from '@/services/property-service';
import { api } from '@/lib/api';

interface Props {
  params: Promise<{ id: string }>;
}

interface ContraparteInfo {
  nombre: string;
}

export default function StudentChatPage({ params }: Props) {
  const { id } = use(params);
  const [contraparteNombre, setContraparteNombre] = useState<string | undefined>();
  const [propiedadTitulo, setPropiedadTitulo] = useState<string | undefined>();

  useEffect(() => {
    let cancelado = false;
    conversationService
      .obtener(id)
      .then(async (conv) => {
        if (cancelado) return;
        // Cargar título propiedad
        const propiedad = await servicioPropiedades
          .obtenerPorId(String(conv.propiedadId))
          .catch(() => null);
        if (propiedad && !cancelado) setPropiedadTitulo(propiedad.titulo);

        // Cargar nombre arrendador
        try {
          const { data } = await api.get<ContraparteInfo>(
            `/usuarios/arrendador/${conv.arrendadorId}/info`,
          );
          if (!cancelado) setContraparteNombre(data?.nombre ?? 'Arrendador');
        } catch {
          if (!cancelado) setContraparteNombre('Arrendador');
        }
      })
      .catch(() => {
        if (!cancelado) setContraparteNombre('Arrendador');
      });

    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <ChatWindow
      conversacionId={id}
      contraparteNombre={contraparteNombre}
      propiedadTitulo={propiedadTitulo}
    />
  );
}
