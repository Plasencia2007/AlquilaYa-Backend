import { z } from 'zod';

// ─── Teléfono ───────────────────────────────────────────────────────────────
// Ítem 338: MISMO regex que `schemas/auth-schema.ts` → `registerSchema.telefono`
// (prefijo +51, 9 dígitos que empiezan con 9). Se duplica el literal en vez de
// importarlo porque auth-schema.ts no exporta el regex de forma aislada y no
// pertenece a este batch de archivos — pero es una cita exacta, no una
// aproximación nueva. Si `registerSchema.telefono` cambia, actualizar aquí también.
export const TELEFONO_REGEX = /^\+519\d{8}$/;
const TELEFONO_MENSAJE = 'Teléfono inválido. Debe empezar con +51 y tener 9 dígitos que empiecen con 9';

// ─── DNI ────────────────────────────────────────────────────────────────────
export const DNI_REGEX = /^\d{8}$/;
const DNI_MENSAJE = 'El DNI debe tener exactamente 8 dígitos';

// ─── RUC ────────────────────────────────────────────────────────────────────
// Ítem 338: puerto EXACTO del algoritmo de
// `servicio-usuarios/src/main/java/.../validaciones/validators/RucPeruanoValidator.java`
// (leído antes de portarlo): formato de 11 dígitos, prefijo de contribuyente SUNAT
// válido y dígito verificador con pesos [5,4,3,2,7,6,5,4,3,2] mód 11.
// OJO: el prefijo "16" NO existe en el validador real — no agregarlo aquí.
const RUC_FORMATO = /^\d{11}$/;
const RUC_PREFIJOS_VALIDOS = new Set(['10', '15', '17', '20']);
const RUC_PESOS_SUNAT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const RUC_MENSAJE = 'RUC inválido: verifica el prefijo (10, 15, 17 o 20) y el dígito verificador SUNAT';

/**
 * Réplica exacta de `RucPeruanoValidator.verificarDigitoControlSunat` +
 * validaciones de formato/prefijo. Un RUC vacío se considera válido aquí (el
 * campo es opcional a nivel de formulario); usar junto a un `.min(1)` si se
 * necesita obligatorio en algún contexto.
 */
export function esRucValido(ruc: string): boolean {
  if (!RUC_FORMATO.test(ruc)) return false;

  const prefijo = ruc.slice(0, 2);
  if (!RUC_PREFIJOS_VALIDOS.has(prefijo)) return false;

  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += Number(ruc[i]) * RUC_PESOS_SUNAT[i];
  }
  const resto = suma % 11;
  const digitoEsperado = (11 - resto) % 10;
  const digitoRecibido = Number(ruc[10]);
  return digitoEsperado === digitoRecibido;
}

// ─── Schemas de formulario ──────────────────────────────────────────────────

/** Datos personales del perfil arrendador (sección "Datos personales"). */
export const personalDataSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  apellido: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  // DNI/teléfono son opcionales a nivel de perfil (se pueden completar luego),
  // pero si se ingresan deben cumplir el formato exacto.
  dni: z.string().regex(DNI_REGEX, DNI_MENSAJE).or(z.literal('')),
  telefono: z.string().regex(TELEFONO_REGEX, TELEFONO_MENSAJE).or(z.literal('')),
});
export type PersonalDataFormData = z.infer<typeof personalDataSchema>;

/** Datos de arrendador (sección "Datos de arrendador"). */
export const arrendadorDataSchema = z.object({
  nombreComercial: z.string().max(100, 'Máximo 100 caracteres'),
  ruc: z.string().refine((v) => v === '' || esRucValido(v), { message: RUC_MENSAJE }),
  esEmpresa: z.boolean(),
});
export type ArrendadorDataFormData = z.infer<typeof arrendadorDataSchema>;
