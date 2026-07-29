import { api } from '@/lib/api';
import type { Page } from '@/types/pagination';
import type { PoliticaCancelacion, ServicioConEstado } from '@/types/propiedad';

export interface PropiedadAdminDTO {
  id: number;
  titulo: string;
  descripcion?: string;
  precio: number;
  direccion: string;
  tipoPropiedad?: string;
  periodoAlquiler?: string;
  videoUrl?: string;
  area?: number;
  nroPiso?: number;
  numDormitorios?: number;
  numBanos?: number;
  capacidadPersonas?: number;
  tieneSala?: boolean;
  tieneCocina?: boolean;
  amoblado?: boolean;
  gestionPorHabitacion?: boolean;
  estaDisponible?: boolean;
  disponibleDesde?: string;
  politicaCancelacion?: PoliticaCancelacion;
  serviciosIncluidos: string[];
  /** Servicios con estado (incluido/aparte/no disponible). */
  servicios?: ServicioConEstado[];
  reglas: string[];
  latitud?: number;
  longitud?: number;
  distanciaMetros?: number;
  aprobadoPorAdmin?: boolean;
  calificacion?: number;
  numResenas?: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  imagenes: string[];
  arrendadorId: number;
  arrendadorNombre?: string;
  arrendadorTelefono?: string;
  arrendadorCorreo?: string;
  fechaCreacion?: string;
}

export const adminPropertyService = {
  listarPendientes: async (): Promise<PropiedadAdminDTO[]> => {
    const res = await api.get<PropiedadAdminDTO[]>('admin/propiedades/pendientes');
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * Ítem 389: TODAS las propiedades (cualquier estado de moderación, sin BORRADOR), para el
   * mapa admin de `metrics/heatmap/page.tsx`. `estado` opcional filtra a uno solo.
   */
  listarTodas: async (estado?: PropiedadAdminDTO['estado']): Promise<PropiedadAdminDTO[]> => {
    const res = await api.get<PropiedadAdminDTO[]>('admin/propiedades', {
      params: estado ? { estado } : undefined,
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  obtenerDetalle: async (id: number): Promise<PropiedadAdminDTO> => {
    const res = await api.get<PropiedadAdminDTO>(`admin/propiedades/${id}`);
    return res.data;
  },

  aprobar: async (id: number): Promise<void> => {
    await api.patch(`admin/propiedades/${id}/aprobar`);
  },

  /** Motivo opcional (ítem 359): el arrendador lo ve en "Mis propiedades" para corregir. */
  rechazar: async (id: number, motivo?: string): Promise<void> => {
    await api.patch(`admin/propiedades/${id}/rechazar`, motivo ? { motivo } : undefined);
  },

  /** Historial paginado de decisiones de moderación (aprobar/rechazar) — ítem 366. */
  historialDecisiones: async (page = 0, size = 20): Promise<Page<DecisionModeracionPropiedad>> => {
    const res = await api.get<Page<DecisionModeracionPropiedad>>(
      `admin/propiedades/historial-decisiones?page=${page}&size=${size}`,
    );
    return res.data;
  },

  /** Conteos reales (ítem 356) para las tarjetas de "aprobadas hoy" / "rechazadas esta semana". */
  historialStats: async (): Promise<HistorialStatsDTO> => {
    const res = await api.get<HistorialStatsDTO>('admin/propiedades/historial-decisiones/stats');
    return res.data;
  },

  /** Override de moderación: cambia la política de cancelación de una propiedad. */
  cambiarPoliticaCancelacion: async (
    id: number,
    politica: PoliticaCancelacion,
  ): Promise<void> => {
    await api.patch(`admin/propiedades/${id}/politica-cancelacion`, { politica });
  },

  /** Señales de fraude/catfishing (#48/#50) + denuncias pendientes (#46) de una propiedad. */
  obtenerConfianza: async (id: number): Promise<ConfianzaDTO> => {
    const res = await api.get<ConfianzaDTO>(`admin/propiedades/${id}/confianza`);
    return res.data;
  },
};

export interface SenalFraude {
  codigo: 'PRECIO_SOSPECHOSO' | 'CONTACTO_EXTERNO' | 'IMAGEN_DUPLICADA';
  mensaje: string;
  severidad: 'ALTA' | 'MEDIA';
}

export interface ConfianzaDTO {
  senales: SenalFraude[];
  denunciasPendientes: number;
}

/** Fila del historial de decisiones de moderación de propiedades (ítem 366). */
export interface DecisionModeracionPropiedad {
  id: number;
  propiedadId: number;
  propiedadTitulo: string;
  adminId?: number;
  decision: 'APROBADO' | 'RECHAZADO';
  motivo?: string;
  fecha: string;
}

/** Conteos reales (ítem 356) sobre el historial de decisiones. */
export interface HistorialStatsDTO {
  aprobadasHoy: number;
  rechazadasSemana: number;
}
