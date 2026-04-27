import { z } from 'zod';

export const loginSchema = z.object({
  correo: z.string().min(1, 'El correo es obligatorio').email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(50),
  dni: z.string().regex(/^[0-9]{8}$/, 'El DNI debe tener 8 dígitos numéricos'),
  correo: z.string().min(1, 'El correo es obligatorio').email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
    .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número')
    .regex(/[@$!%*?&]/, 'Debe incluir al menos un carácter especial (@$!%*?&)'),

  telefono: z.string().min(1, 'El teléfono es obligatorio'),
  rol: z.enum(['ESTUDIANTE', 'ARRENDADOR'] as const, {
    errorMap: () => ({ message: 'Selecciona un rol válido' }),
  }),
});

export const studentDetailsSchema = z.object({
  universidad: z.string().min(2, 'La universidad es obligatoria'),
  codigoEstudiante: z.string().min(1, 'El código es obligatorio'),
  carrera: z.string().min(2, 'La carrera es obligatoria'),
  ciclo: z
    .string()
    .min(1, 'El ciclo es obligatorio')
    .regex(/^([1-9]|1[0-2])$/, 'Ciclo entre 1 y 12'),
});

export const landlordDetailsSchema = z.object({
  ruc: z.string().regex(/^([0-9]{11})?$/, 'El RUC debe tener 11 dígitos').optional().or(z.literal('')),
  direccionCuartos: z.string().min(5, 'Dirección obligatoria'),
  latitud: z.number().refine((v) => v !== null && !Number.isNaN(v), 'Marca la ubicación en el mapa'),
  longitud: z.number().refine((v) => v !== null && !Number.isNaN(v), 'Marca la ubicación en el mapa'),
});

export const otpSchema = z.object({
  codigo: z.string().regex(/^[0-9]{6}$/, 'Ingresa los 6 dígitos'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type StudentDetailsFormData = z.infer<typeof studentDetailsSchema>;
export type LandlordDetailsFormData = z.infer<typeof landlordDetailsSchema>;
export type OtpFormData = z.infer<typeof otpSchema>;
