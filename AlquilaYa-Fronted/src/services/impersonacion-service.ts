import { api } from '@/lib/api';

export interface UsuarioImpersonado {
  id: string | number;
  nombre: string;
  correo: string;
  rol: 'ESTUDIANTE' | 'ARRENDADOR' | 'ADMIN';
  perfilId: number | null;
}

interface IniciarImpersonacionResponse {
  expiraEnSegundos: number;
  usuario: UsuarioImpersonado;
}

/**
 * Ítem 379: "Ver como usuario". El backend nunca devuelve el JWT en el body — lo pone
 * directo como cookie httpOnly (mismo patrón que login), así que este servicio solo maneja
 * la llamada HTTP; `auth-store` es quien decide qué hacer con la identidad devuelta.
 */
async function iniciar(usuarioId: string | number): Promise<IniciarImpersonacionResponse> {
  const { data } = await api.post<IniciarImpersonacionResponse>(`usuarios/admin/impersonar/${usuarioId}`);
  return data;
}

async function salir(): Promise<void> {
  await api.post('usuarios/admin/impersonar/salir');
}

export const impersonacionService = { iniciar, salir };
