import { api } from '@/lib/api';
import { servicioPropiedades } from '@/services/property-service';
import type { Reserva, EstadoReserva } from '@/types/reserva';

interface ReservaResponseDTO {
  id: number;
  propiedadId: number;
  estudianteId: number;
  arrendadorId: number;
  fechaInicio: string;
  fechaFin: string;
  montoTotal: number;
  estado: EstadoReserva;
  propiedadTitulo: string;
  estudianteNombre?: string;
  estudianteCorreo?: string;
  motivoRechazo?: string;
  fechaCreacion: string;
}

interface CrearReservaPayload {
  propiedadId: string | number;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
}

function fromDTO(dto: ReservaResponseDTO): Reserva {
  return {
    id: String(dto.id),
    propiedadId: String(dto.propiedadId),
    propiedadTitulo: dto.propiedadTitulo,
    estudianteId: String(dto.estudianteId),
    estudianteNombre: dto.estudianteNombre,
    arrendadorId: String(dto.arrendadorId),
    fechaInicio: dto.fechaInicio,
    fechaFin: dto.fechaFin,
    montoTotal: Number(dto.montoTotal),
    estado: dto.estado,
    motivoRechazo: dto.motivoRechazo,
    fechaCreacion: dto.fechaCreacion,
  };
}

/**
 * Enriquece reservas con datos visuales (imagen + ubicación) consultando
 * la propiedad. Falla silencioso si no se puede recuperar — la card cae al
 * placeholder.
 */
async function enriquecer(reservas: Reserva[]): Promise<Reserva[]> {
  const ids = Array.from(new Set(reservas.map((r) => r.propiedadId)));
  const propiedades = await Promise.all(
    ids.map((id) => servicioPropiedades.obtenerPorId(id).catch(() => null)),
  );
  const map = new Map(
    propiedades.filter((p): p is NonNullable<typeof p> => !!p).map((p) => [p.id, p]),
  );
  return reservas.map((r) => {
    const p = map.get(r.propiedadId);
    if (!p) return r;
    return {
      ...r,
      propiedadImagen: p.imagenes[0],
      propiedadUbicacion: p.ubicacion,
    };
  });
}

export const reservationService = {
  listarMias: async (): Promise<Reserva[]> => {
    const { data } = await api.get<ReservaResponseDTO[]>('/reservas/mis');
    const reservas = data.map(fromDTO);
    return enriquecer(reservas);
  },

  obtenerPorId: async (id: string): Promise<Reserva | null> => {
    try {
      const { data } = await api.get<ReservaResponseDTO>(`/reservas/${id}`);
      const reserva = fromDTO(data);
      const enriched = await enriquecer([reserva]);
      return enriched[0];
    } catch {
      return null;
    }
  },

  crear: async (payload: CrearReservaPayload): Promise<Reserva> => {
    const { data } = await api.post<ReservaResponseDTO>('/reservas', {
      propiedadId: Number(payload.propiedadId),
      fechaInicio: payload.fechaInicio,
      fechaFin: payload.fechaFin,
    });
    return fromDTO(data);
  },

  cancelar: async (id: string): Promise<Reserva> => {
    const { data } = await api.patch<ReservaResponseDTO>(`/reservas/${id}/cancelar`);
    return fromDTO(data);
  },
};
