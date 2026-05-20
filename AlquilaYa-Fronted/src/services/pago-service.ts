import { api } from '@/lib/api';

interface PreferenciaResponse {
  preferenceId: string;
  init_point: string;
  sandbox_init_point: string;
}

async function crearPreferencia(reservaId: string | number): Promise<PreferenciaResponse> {
  const { data } = await api.post<PreferenciaResponse>(`/pagos/preferencia/${reservaId}`);
  return data;
}

export const pagoService = { crearPreferencia };
