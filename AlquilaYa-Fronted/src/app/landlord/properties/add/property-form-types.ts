import { MAX_PROPERTY_IMAGES } from '@/lib/property-photos';
import type {
  PeriodoAlquiler,
  PoliticaCancelacion,
  TipoPropiedad,
} from '@/types/propiedad';

export interface FormState {
  titulo: string;
  descripcion: string;
  precio: string;
  /** Depósito de garantía (S/), adicional a la renta. Opcional. */
  deposito: string;
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
  /** Monto mensual (S/, texto crudo del input) por cada servicio en `serviciosAparte`, indexado por su clave. */
  montosServiciosAparte: Record<string, string>;
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
  deposito: '',
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
  montosServiciosAparte: {},
  reglas: [],
  estaDisponible: true,
  disponibleDesde: '',
  videoUrl: '',
  politicaCancelacion: 'FLEXIBLE',
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
/** Ítem 333: unificado con el modal de edición rápida en `@/lib/property-photos`, subido a 12. */
export const MAX_IMAGES = MAX_PROPERTY_IMAGES;
