import type {
  PeriodoAlquiler,
  PoliticaCancelacion,
  TipoPropiedad,
} from '@/types/propiedad';

export interface FormState {
  titulo: string;
  descripcion: string;
  precio: string;
  direccion: string;
  tipoPropiedad: TipoPropiedad | '';
  periodoAlquiler: PeriodoAlquiler | '';
  area: string;
  nroPiso: string;
  numDormitorios: string;
  numBanos: string;
  capacidadPersonas: string;
  tieneSala: boolean;
  tieneCocina: boolean;
  amoblado: boolean;
  gestionPorHabitacion: boolean;
  latitud: string;
  longitud: string;
  serviciosIncluidos: string[];
  /** Servicios disponibles pero que se pagan aparte. */
  serviciosAparte: string[];
  reglas: string[];
  estaDisponible: boolean;
  disponibleDesde: string;
  /** Enlace de video (YouTube/Vimeo/.mp4). Opcional. */
  videoUrl: string;
  politicaCancelacion: PoliticaCancelacion;
}

export type Errores = Partial<Record<keyof FormState | 'imagen' | 'general', string>>;

export const INITIAL_FORM: FormState = {
  titulo: '',
  descripcion: '',
  precio: '',
  direccion: '',
  tipoPropiedad: 'CUARTO_INDIVIDUAL',
  periodoAlquiler: 'MENSUAL',
  area: '',
  nroPiso: '',
  numDormitorios: '',
  numBanos: '',
  capacidadPersonas: '',
  tieneSala: false,
  tieneCocina: false,
  amoblado: false,
  gestionPorHabitacion: false,
  latitud: '',
  longitud: '',
  serviciosIncluidos: [],
  serviciosAparte: [],
  reglas: [],
  estaDisponible: true,
  disponibleDesde: '',
  videoUrl: '',
  politicaCancelacion: 'FLEXIBLE',
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_IMAGES = 6;
