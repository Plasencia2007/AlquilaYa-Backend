import { api } from '@/lib/api';
import { servicioPropiedades } from '@/services/property-service';
import type { Reserva, EstadoReserva } from '@/types/reserva';

/** Espejo de `com.alquilaya.serviciopropiedades.enums.EstadoCuota` (G2). */
export type EstadoCuotaRenta = 'PENDIENTE' | 'PAGADA' | 'VENCIDA';

/**
 * Cuota mensual del cronograma de renta recurrente de una reserva ya PAGADA
 * (ítem 205). Es el calendario de cobro follow-up, distinto de `CuotaPago` en
 * `grupo-service.ts` (esa es la división del pago inicial entre roommates).
 */
export interface CuotaRenta {
  id: number;
  reservaId: number;
  numeroCuota: number;
  /** Mes facturado, formato YYYY-MM. */
  periodo: string;
  monto: number;
  estado: EstadoCuotaRenta;
  /** YYYY-MM-DD */
  fechaVencimiento: string;
  fechaPago: string | null;
  recordatorioEnviado: boolean;
  fechaCreacion: string;
}

interface CuotaRentaResponseDTO {
  id: number;
  reservaId: number;
  numeroCuota: number;
  periodo: string;
  monto: number;
  estado: EstadoCuotaRenta;
  fechaVencimiento: string;
  fechaPago: string | null;
  recordatorioEnviado: boolean;
  fechaCreacion: string;
}

function fromCuotaDTO(dto: CuotaRentaResponseDTO): CuotaRenta {
  return {
    id: dto.id,
    reservaId: dto.reservaId,
    numeroCuota: dto.numeroCuota,
    periodo: dto.periodo,
    monto: Number(dto.monto),
    estado: dto.estado,
    fechaVencimiento: dto.fechaVencimiento,
    fechaPago: dto.fechaPago,
    recordatorioEnviado: dto.recordatorioEnviado,
    fechaCreacion: dto.fechaCreacion,
  };
}

interface ReservaResponseDTO {
  id: number;
  propiedadId: number;
  habitacionId?: number | null;
  estudianteId: number;
  arrendadorId: number;
  fechaInicio: string;
  fechaFin: string;
  montoTotal: number;
  comision?: number;
  estado: EstadoReserva;
  propiedadTitulo: string;
  estudianteNombre?: string;
  estudianteCorreo?: string;
  estudianteTelefono?: string;
  estudianteUniversidad?: string;
  estudianteCarrera?: string;
  estudianteVerificado?: boolean;
  estudianteScore?: number;
  estudianteNivelReputacion?: string;
  motivoRechazo?: string;
  motivoCancelacion?: string;
  fechaCreacion: string;
  grupoId?: number | null;
  /** Firma electrónica del contrato (ítem 237). Null = esa parte aún no firmó. */
  firmaEstudianteAt?: string | null;
  firmaArrendadorAt?: string | null;
  /** Solo presente cuando `estado === 'APROBADA'` (ítem 238). */
  fechaExpiracion?: string | null;
}

/**
 * Página de "mis reservas" tal como la serializa Spring `Page<T>` (ítem 234).
 * Mismo patrón `content/totalElements/totalPages/number/size` que
 * `PaginaRoommates` en `roommate-service.ts` (ítem 216).
 */
export interface PaginaReservas {
  content: Reserva[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface PaginaReservasDTO {
  content: ReservaResponseDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface CrearReservaPayload {
  propiedadId: string | number;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  /** Obligatoria si la propiedad se gestiona por habitaciones. */
  habitacionId?: number;
}

function fromDTO(dto: ReservaResponseDTO): Reserva {
  return {
    id: String(dto.id),
    propiedadId: String(dto.propiedadId),
    habitacionId: dto.habitacionId ?? undefined,
    propiedadTitulo: dto.propiedadTitulo,
    estudianteId: String(dto.estudianteId),
    estudianteNombre: dto.estudianteNombre,
    estudianteScore: dto.estudianteScore,
    estudianteNivelReputacion: dto.estudianteNivelReputacion as Reserva['estudianteNivelReputacion'],
    arrendadorId: String(dto.arrendadorId),
    fechaInicio: dto.fechaInicio,
    fechaFin: dto.fechaFin,
    montoTotal: Number(dto.montoTotal),
    comision: dto.comision != null ? Number(dto.comision) : undefined,
    estado: dto.estado,
    motivoRechazo: dto.motivoRechazo,
    motivoCancelacion: dto.motivoCancelacion,
    fechaCreacion: dto.fechaCreacion,
    estudianteCorreo: dto.estudianteCorreo,
    estudianteTelefono: dto.estudianteTelefono,
    estudianteUniversidad: dto.estudianteUniversidad,
    estudianteCarrera: dto.estudianteCarrera,
    estudianteVerificado: dto.estudianteVerificado,
    grupoId: dto.grupoId ?? undefined,
    firmaEstudianteAt: dto.firmaEstudianteAt ?? undefined,
    firmaArrendadorAt: dto.firmaArrendadorAt ?? undefined,
    fechaExpiracion: dto.fechaExpiracion ?? undefined,
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

  /**
   * Mis reservas PAGINADAS del backend (ítem 234). Si se pasa `estado`, el backend
   * pagina DENTRO de ese filtro (igual que las tabs de estado de la UI) en vez de
   * traer todas las reservas de una sola vez.
   */
  listarMiasPaginadas: async (params?: {
    page?: number;
    size?: number;
    estado?: EstadoReserva;
  }): Promise<PaginaReservas> => {
    const { data } = await api.get<PaginaReservasDTO>('/reservas/mis', {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 10,
        estado: params?.estado,
      },
    });
    const content = await enriquecer(data.content.map(fromDTO));
    return {
      content,
      totalElements: data.totalElements,
      totalPages: data.totalPages,
      number: data.number,
      size: data.size,
    };
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
      habitacionId: payload.habitacionId,
    });
    return fromDTO(data);
  },

  cancelar: async (id: string, motivo?: string): Promise<Reserva> => {
    const { data } = await api.patch<ReservaResponseDTO>(`/reservas/${id}/cancelar`, {
      motivo: motivo ?? '',
    });
    return fromDTO(data);
  },

  /**
   * Lista las reservas del arrendador autenticado. Si se pasa `estado`
   * el backend filtra; en caso contrario devuelve todas. Enriquecemos las
   * filas con datos visibles de la propiedad.
   */
  listarComoArrendador: async (estado?: EstadoReserva): Promise<Reserva[]> => {
    const url = estado
      ? `/reservas/arrendador/estado/${estado}`
      : '/reservas/arrendador';
    const { data } = await api.get<ReservaResponseDTO[]>(url);
    const reservas = data.map(fromDTO);
    return enriquecer(reservas);
  },

  aprobar: async (id: string): Promise<Reserva> => {
    const { data } = await api.patch<ReservaResponseDTO>(`/reservas/${id}/aprobar`);
    return fromDTO(data);
  },

  rechazar: async (id: string, motivo?: string): Promise<Reserva> => {
    const { data } = await api.patch<ReservaResponseDTO>(`/reservas/${id}/rechazar`, {
      motivo: motivo ?? '',
    });
    return fromDTO(data);
  },

  finalizar: async (id: string): Promise<Reserva> => {
    const { data } = await api.patch<ReservaResponseDTO>(`/reservas/${id}/finalizar`);
    return fromDTO(data);
  },

  /**
   * Cronograma de cuotas mensuales de renta de una reserva (G2, ítem 205).
   * Solo tiene datos una vez que la reserva está PAGADA y el backend generó
   * el calendario; si aún no hay cuotas devuelve `[]`.
   */
  obtenerCuotas: async (reservaId: string | number): Promise<CuotaRenta[]> => {
    const { data } = await api.get<CuotaRentaResponseDTO[]>(`/reservas/${reservaId}/cuotas`);
    return data.map(fromCuotaDTO);
  },

  /**
   * Ítem 371: (re)genera el cronograma de cuotas de una reserva — `CuotaRentaController#generar`,
   * `POST /api/v1/reservas/{reservaId}/cuotas/generar`, ADMIN-only (permiso GESTIONAR_SISTEMA),
   * idempotente (la clave natural `(reservaId, numeroCuota)` evita duplicados). El backend solo
   * devuelve el conteo creado, no las filas — el caller debe volver a llamar `obtenerCuotas` si
   * quiere el detalle para la preview.
   */
  generarCuotas: async (reservaId: string | number): Promise<{ reservaId: number; cuotasCreadas: number }> => {
    const { data } = await api.post<{ reservaId: number; cuotasCreadas: number }>(
      `/reservas/${reservaId}/cuotas/generar`,
    );
    return data;
  },

  /**
   * PDF del contrato (G4, ítem 236). No hay precedente de descarga autenticada en el
   * proyecto (los links a MercadoPago son cross-origin, no llevan la cookie httpOnly de
   * este backend) — usamos `responseType: 'blob'` sobre la instancia `api` para que el
   * fetch mande la cookie de sesión (withCredentials ya está seteado ahí) y el caller
   * arme un object URL con `URL.createObjectURL`.
   */
  descargarContrato: async (reservaId: string | number): Promise<Blob> => {
    const { data } = await api.get<Blob>(`/reservas/${reservaId}/contrato`, {
      responseType: 'blob',
    });
    return data;
  },

  /**
   * Firma electrónica del contrato por la parte autenticada (G4, ítem 237). El backend
   * registra solo un timestamp por parte (placeholder honesto, no es firma criptográfica)
   * y devuelve la reserva actualizada con `firmaEstudianteAt`/`firmaArrendadorAt`.
   */
  firmarContrato: async (reservaId: string | number): Promise<Reserva> => {
    const { data } = await api.post<ReservaResponseDTO>(`/reservas/${reservaId}/contrato/firmar`);
    return fromDTO(data);
  },
};
