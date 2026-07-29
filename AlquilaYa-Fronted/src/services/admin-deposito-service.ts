import { api } from '@/lib/api';
import type { Deposito, EstadoDeposito } from '@/services/deposito-service';

/**
 * Ítem 369: CRUD admin del depósito de garantía (G3). Namespace separado de
 * `deposito-service.ts` a propósito — ese archivo es lectura self-service (estudiante/
 * arrendador viendo SU propia reserva); esto es `hasRole('ADMIN')` estricto sobre
 * `/api/v1/pagos/admin/depositos/**` (`DepositoController`, clase completa bajo
 * `@PreAuthorize("hasRole('ADMIN')")`). Reusa el tipo `Deposito`/`EstadoDeposito` de ese
 * archivo (misma entidad del backend) en vez de redeclararlo.
 *
 * Máquina de estados (ver `DepositoService` en el backend):
 *   PENDIENTE --(capturar)--> RETENIDO --(devolver)--> DEVUELTO
 *                                      --(retener-parcial)--> RETENIDO_PARCIAL
 *                                      --(perder)--> PERDIDO
 * Todas las transiciones son idempotentes (repetir la misma acción sobre el estado
 * destino no falla, el backend devuelve el depósito tal cual).
 */

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

export interface CrearDepositoPayload {
  reservaId: string | number;
  monto: number;
}

export interface CapturarDepositoPayload {
  /** Id del pago en Mercado Pago si el depósito se cobró junto con la renta. Opcional. */
  paymentId?: string;
}

export interface RetenerParcialPayload {
  montoRetenido: number;
  motivo: string;
}

export interface PerderDepositoPayload {
  motivo: string;
}

export const adminDepositoService = {
  /** Registra el depósito PENDIENTE de una reserva (el admin lo crea al aprobarla/cobrarla). */
  crear: async (payload: CrearDepositoPayload): Promise<Deposito> => {
    const { data } = await api.post<DepositoResponseDTO>('/pagos/admin/depositos', payload);
    return fromDTO(data);
  },

  /** Confirma el cobro (PENDIENTE → RETENIDO). Idempotente si ya estaba RETENIDO. */
  capturar: async (id: string | number, payload?: CapturarDepositoPayload): Promise<Deposito> => {
    const { data } = await api.post<DepositoResponseDTO>(
      `/pagos/admin/depositos/${id}/capturar`,
      payload,
    );
    return fromDTO(data);
  },

  /** Devuelve el depósito completo (RETENIDO → DEVUELTO); dispara reembolso real en MP si aplica. */
  devolver: async (id: string | number): Promise<Deposito> => {
    const { data } = await api.post<DepositoResponseDTO>(`/pagos/admin/depositos/${id}/devolver`);
    return fromDTO(data);
  },

  /** Retiene parte por daños y devuelve el resto (RETENIDO → RETENIDO_PARCIAL). Irreversible. */
  retenerParcial: async (id: string | number, payload: RetenerParcialPayload): Promise<Deposito> => {
    const { data } = await api.post<DepositoResponseDTO>(
      `/pagos/admin/depositos/${id}/retener-parcial`,
      payload,
    );
    return fromDTO(data);
  },

  /** El arrendador se queda el depósito íntegro (RETENIDO → PERDIDO). Irreversible. */
  perder: async (id: string | number, payload: PerderDepositoPayload): Promise<Deposito> => {
    const { data } = await api.post<DepositoResponseDTO>(`/pagos/admin/depositos/${id}/perder`, payload);
    return fromDTO(data);
  },

  /** Historial de depósito(s) de una reserva puntual (normalmente 0 o 1 fila). */
  porReserva: async (reservaId: string | number): Promise<Deposito[]> => {
    const { data } = await api.get<DepositoResponseDTO[]>(`/pagos/admin/depositos/reserva/${reservaId}`);
    return data.map(fromDTO);
  },

  /** Historial completo de depósitos de todas las reservas de un arrendador. */
  porArrendador: async (arrendadorId: string | number): Promise<Deposito[]> => {
    const { data } = await api.get<DepositoResponseDTO[]>(
      `/pagos/admin/depositos/arrendador/${arrendadorId}`,
    );
    return data.map(fromDTO);
  },
};
