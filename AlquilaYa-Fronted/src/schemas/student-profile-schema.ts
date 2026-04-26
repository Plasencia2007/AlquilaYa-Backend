import { z } from 'zod';

export const datosPersonalesSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  apellido: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  telefono: z.string().min(8, 'Teléfono inválido').max(20),
  passwordActual: z.string().optional(),
});

export const datosAcademicosSchema = z.object({
  universidad: z.string().min(2, 'La universidad es obligatoria'),
  codigoEstudiante: z.string().min(1, 'El código es obligatorio'),
  carrera: z.string().min(2, 'La carrera es obligatoria'),
  ciclo: z
    .string()
    .regex(/^([1-9]|1[0-2])$/, 'Ciclo entre 1 y 12'),
});

export const cambioPasswordSchema = z
  .object({
    actual: z.string().min(1, 'La contraseña actual es obligatoria'),
    nueva: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string().min(8, 'Mínimo 8 caracteres'),
  })
  .refine((d) => d.nueva === d.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  });

export type DatosPersonalesData = z.infer<typeof datosPersonalesSchema>;
export type DatosAcademicosData = z.infer<typeof datosAcademicosSchema>;
export type CambioPasswordData = z.infer<typeof cambioPasswordSchema>;
