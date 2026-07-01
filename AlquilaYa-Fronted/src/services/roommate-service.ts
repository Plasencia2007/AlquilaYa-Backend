import { api } from '@/lib/api';
import type { NivelReputacion } from '@/types/reputacion';

export interface PerfilConvivencia {
  estudianteId: number;
  usuarioId?: number;
  nombre?: string;
  apellido?: string;
  avatar?: string;
  universidad?: string;
  carrera?: string;
  ciclo?: number;
  verificado: boolean;
  score?: number;
  nivelReputacion?: NivelReputacion;
  completitud: number;
  compatibilidadScore?: number;
  compatibilidadNivel?: 'Alta' | 'Media' | 'Baja';
  bio?: string;
  instagram?: string;
  fuma?: string;
  horario?: string;
  orden?: string;
  ruido?: string;
  sociabilidad?: string;
  mascotas?: string;
  invitados?: string;
  genero?: string;
  comparteCon?: string;
  presupuestoMin?: number;
  presupuestoMax?: number;
  fechaMudanza?: string;
  numCompaneros?: number;
  buscaCompaneros: boolean;
  intereses: string[];
  zonasPreferidas: string[];
}

export type ConvivenciaUpdate = Partial<
  Pick<
    PerfilConvivencia,
    | 'bio' | 'instagram' | 'fuma' | 'horario' | 'orden' | 'ruido' | 'sociabilidad'
    | 'mascotas' | 'invitados' | 'genero' | 'comparteCon' | 'presupuestoMin'
    | 'presupuestoMax' | 'fechaMudanza' | 'numCompaneros' | 'buscaCompaneros'
    | 'intereses' | 'zonasPreferidas'
  >
>;

/** Vocabularios fijos (deben coincidir con los valores que guarda el backend). */
export const OPCIONES = {
  fuma: [
    { v: 'NO', l: 'No fumo' },
    { v: 'SOLO_AFUERA', l: 'Solo afuera' },
    { v: 'SI', l: 'Sí fumo' },
  ],
  horario: [
    { v: 'MADRUGADOR', l: 'Madrugador' },
    { v: 'NOCTURNO', l: 'Nocturno' },
    { v: 'FLEXIBLE', l: 'Flexible' },
  ],
  orden: [
    { v: 'MUY_ORDENADO', l: 'Muy ordenado' },
    { v: 'NORMAL', l: 'Normal' },
    { v: 'RELAJADO', l: 'Relajado' },
  ],
  ruido: [
    { v: 'SILENCIO', l: 'Necesito silencio' },
    { v: 'INDIFERENTE', l: 'Me da igual' },
  ],
  sociabilidad: [
    { v: 'TRANQUILO', l: 'Tranquilo' },
    { v: 'SOCIABLE', l: 'Sociable' },
    { v: 'FIESTERO', l: 'Fiestero' },
  ],
  mascotas: [
    { v: 'NO', l: 'Sin mascotas' },
    { v: 'ACEPTO', l: 'Acepto mascotas' },
    { v: 'TENGO', l: 'Tengo mascota' },
  ],
  invitados: [
    { v: 'CASI_NUNCA', l: 'Casi nunca' },
    { v: 'AVECES', l: 'A veces' },
    { v: 'SEGUIDO', l: 'Seguido' },
  ],
  genero: [
    { v: 'MASCULINO', l: 'Masculino' },
    { v: 'FEMENINO', l: 'Femenino' },
    { v: 'OTRO', l: 'Otro' },
  ],
  comparteCon: [
    { v: 'MIXTO', l: 'Indistinto (mixto)' },
    { v: 'MISMO_GENERO', l: 'Mismo género' },
  ],
} as const;

/** Etiqueta legible de un valor de vocabulario (para mostrar en tarjetas). */
export function labelOpcion(campo: keyof typeof OPCIONES, valor?: string): string | undefined {
  if (!valor) return undefined;
  return OPCIONES[campo].find((o) => o.v === valor)?.l ?? valor;
}


export const roommateService = {
  listarRoommates: async (): Promise<PerfilConvivencia[]> => {
    const { data } = await api.get<PerfilConvivencia[]>('/usuarios/roommates');
    return data;
  },
  miConvivencia: async (): Promise<PerfilConvivencia> => {
    const { data } = await api.get<PerfilConvivencia>('/usuarios/perfil/convivencia');
    return data;
  },
  actualizarConvivencia: async (req: ConvivenciaUpdate): Promise<PerfilConvivencia> => {
    const { data } = await api.put<PerfilConvivencia>('/usuarios/perfil/convivencia', req);
    return data;
  },
  convivenciaDe: async (estudianteId: number | string): Promise<PerfilConvivencia> => {
    const { data } = await api.get<PerfilConvivencia>(`/usuarios/estudiante/${estudianteId}/convivencia`);
    return data;
  },
};
