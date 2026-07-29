import { api } from '@/lib/api';

/** Espejo de `com.alquilaya.serviciopagos.entities.Deposito` (G3, ítem 243). */
export type EstadoDeposito = 'PENDIENTE' | 'RETENIDO' | 'DEVUELTO' | 'RETENIDO_PARCIAL' | 'PERDIDO';

export interface Deposito {
  id: number;
  reservaId: number;
  arrendadorId: number | null;
  monto: number;
  /** Cuánto se devolvió realmente (RETENIDO_PARCIAL/DEVUELTO). Null si aún no aplica. */
  montoDevuelto: number | null;
  estado: EstadoDeposito;
  paymentId: string | null;
  motivoRetencion: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

interface DepositoResponseDTO {
  id: number;
  reservaId: number;
  arrendadorId: number | null;
  monto: number;
  montoDevuelto: number | null;
  estado: EstadoDeposito;
  paymentId: string | null;
  motivoRetencion: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

function fromDTO(dto: DepositoResponseDTO): Deposito {
  return {
    id: dto.id,
    reservaId: dto.reservaId,
    arrendadorId: dto.arrendadorId,
    monto: Number(dto.monto),
    montoDevuelto: dto.montoDevuelto != null ? Number(dto.montoDevuelto) : null,
    estado: dto.estado,
    paymentId: dto.paymentId,
    motivoRetencion: dto.motivoRetencion,
    fechaCreacion: dto.fechaCreacion,
    fechaActualizacion: dto.fechaActualizacion,
  };
}

export const depositoService = {
  /**
   * Depósito de garantía de UNA reserva (G3, ítem 243), lectura self-service — el backend
   * (`DepositoSelfServiceController`, `GET /api/v1/pagos/depositos/reserva/{reservaId}`) valida
   * que el usuario autenticado sea el estudiante O el arrendador de esa reserva. 404 = la
   * reserva no tiene depósito asociado todavía (no toda reserva PAGADA lo pide) — se traduce a
   * `null` para que el caller pueda ocultar la sección en vez de mostrar un estado vacío.
   */
  obtenerPorReserva: async (reservaId: string | number): Promise<Deposito | null> => {
    try {
      const { data } = await api.get<DepositoResponseDTO>(`/pagos/depositos/reserva/${reservaId}`);
      return fromDTO(data);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw err;
    }
  },

  /**
   * Ítem 327: historial COMPLETO de depósitos de garantía del arrendador autenticado, self-service
   * — el backend (`DepositoSelfServiceController#misDepositos`, `GET /api/v1/pagos/depositos/arrendador`)
   * filtra siempre por el `perfilId` del JWT, nunca por un id que venga del cliente. Deliberadamente
   * distinto del endpoint admin-only `/pagos/admin/depositos/arrendador/{id}` (fuera de alcance
   * para el arrendador). Solo lectura: retener parcial / marcar perdido sigue siendo un flujo de
   * ADMIN/moderación, no está expuesto acá.
   */
  misDepositos: async (): Promise<Deposito[]> => {
    const { data } = await api.get<DepositoResponseDTO[]>('/pagos/depositos/arrendador');
    return data.map(fromDTO);
  },
};
