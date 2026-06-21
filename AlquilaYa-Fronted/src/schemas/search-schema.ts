import { z } from 'zod';

// Alineado con el enum TipoPropiedad del backend (el valor se compara exacto contra
// p.tipoPropiedad en la búsqueda, así que deben coincidir).
export const TIPOS_PROPIEDAD = [
  'CUARTO_INDIVIDUAL',
  'CUARTO_COMPARTIDO',
  'DEPARTAMENTO',
  'MINI_DEPA',
  'CASA',
  'SUITE',
] as const;
export const ORDENES = ['distancia', 'cercania', 'precio', 'calificacion'] as const;
export const VISTAS = ['lista', 'mapa'] as const;

export const PRECIO_MIN_DEFAULT = 200;
export const PRECIO_MAX_DEFAULT = 3000;
export const DISTANCIA_MAX_DEFAULT = 15;

export const filtrosSchema = z.object({
  zona: z.string().trim().max(80).optional(),
  precioMin: z.number().int().nonnegative().optional(),
  precioMax: z.number().int().positive().optional(),
  tipo: z.enum(TIPOS_PROPIEDAD).optional(),
  servicios: z.array(z.string().min(1)).default([]),
  distanciaMaxKm: z.number().positive().max(50).optional(),
  calificacionMin: z.number().min(0).max(5).optional(),
  // Filtro por universidad y su zona de cobertura (catálogo). El estudiante elige
  // su universidad y, opcionalmente, una zona concreta dentro de ella.
  universidadId: z.number().int().positive().optional(),
  zonaId: z.number().int().positive().optional(),
  // Capacidad mínima de personas y dormitorios mínimos (inmuebles completos).
  capacidadMin: z.number().int().positive().optional(),
  dormitoriosMin: z.number().int().positive().optional(),
  orden: z.enum(ORDENES).default('distancia'),
  view: z.enum(VISTAS).default('lista'),
});

export type Filtros = z.infer<typeof filtrosSchema>;
export type TipoPropiedadFiltro = (typeof TIPOS_PROPIEDAD)[number];
export type Orden = (typeof ORDENES)[number];
export type Vista = (typeof VISTAS)[number];

/**
 * Filtros con todos los campos requeridos (defaults aplicados). Útil para el
 * formulario del Sheet, que necesita controlled inputs con valores iniciales.
 */
export const filtrosFormSchema = filtrosSchema.extend({
  precioMin: z.number().int().nonnegative().default(PRECIO_MIN_DEFAULT),
  precioMax: z.number().int().positive().default(PRECIO_MAX_DEFAULT),
  distanciaMaxKm: z.number().positive().max(50).default(DISTANCIA_MAX_DEFAULT),
  calificacionMin: z.number().min(0).max(5).default(0),
});

export type FiltrosFormData = z.infer<typeof filtrosFormSchema>;
