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
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  telefono: z.string().min(1, 'El teléfono es obligatorio'),
  rol: z.enum(['ESTUDIANTE', 'ARRENDADOR'] as const, {
    errorMap: () => ({ message: 'Selecciona un rol válido' }),
  }),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
