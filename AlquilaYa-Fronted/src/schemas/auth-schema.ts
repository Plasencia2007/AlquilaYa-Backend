import { z } from 'zod';

export const loginSchema = z.object({
  correo: z.string().min(1, 'El correo es obligatorio').email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  apellido: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  dni: z.string().regex(/^[0-9]{8}$/, 'DNI: 8 dígitos'),
  correo: z.string().min(1, 'Requerido').email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Falta una mayúscula')
    .regex(/[a-z]/, 'Falta una minúscula')
    .regex(/[0-9]/, 'Falta un número')
    .regex(/[@$!%*?&]/, 'Falta un símbolo (@$!%*?&)'),

  telefono: z
    .string()
    .min(1, 'Requerido')
    .regex(/^\+519\d{8}$/, 'Teléfono inválido. Debe empezar con +51 y tener 9 dígitos que empiecen con 9'),
  rol: z.enum(['ESTUDIANTE', 'ARRENDADOR'] as const, {
    errorMap: () => ({ message: 'Selecciona un rol' }),
  }),
});

export const studentDetailsSchema = z.object({
  universidad: z.string().min(2, 'Requerido'),
  codigoEstudiante: z.string().min(1, 'Requerido'),
  carrera: z.string().min(2, 'Requerido'),
  ciclo: z
    .string()
    .min(1, 'Requerido')
    .regex(/^([1-9]|1[0-2])$/, 'Ciclo entre 1 y 12'),
});

export const landlordDetailsSchema = z.object({
  ruc: z.string().regex(/^([0-9]{11})?$/, 'RUC: 11 dígitos').optional().or(z.literal('')),
  direccionCuartos: z.string().min(5, 'Requerido'),
  latitud: z.number().refine((v) => v !== null && !Number.isNaN(v), 'Marca la ubicación'),
  longitud: z.number().refine((v) => v !== null && !Number.isNaN(v), 'Marca la ubicación'),
});

export const otpSchema = z.object({
  codigo: z.string().regex(/^[0-9]{6}$/, 'Ingresa los 6 dígitos'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type StudentDetailsFormData = z.infer<typeof studentDetailsSchema>;
export type LandlordDetailsFormData = z.infer<typeof landlordDetailsSchema>;
export type OtpFormData = z.infer<typeof otpSchema>;
