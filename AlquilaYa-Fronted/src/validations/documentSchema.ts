import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

export const documentUploadSchema = z.object({
  archivo: z
    .custom<File>()
    .refine((file) => file instanceof File, 'Debe seleccionar un archivo')
    .refine((file) => file.size <= MAX_FILE_SIZE, `El archivo no puede exceder los 5MB`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Solo se permiten formatos JPG, PNG y PDF"
    ),
  tipo: z.enum(['DNI_FRONTAL', 'DNI_REVERSO', 'CARNE_ESTUDIANTE', 'RECIBO_LUZ'] as const, {
    errorMap: () => ({ message: 'Tipo de documento inválido' }),
  }),
});

export type DocumentUploadData = z.infer<typeof documentUploadSchema>;
