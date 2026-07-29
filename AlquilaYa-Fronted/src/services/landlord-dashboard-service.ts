import { api } from '@/lib/api';

export interface ActividadReciente {
  tipo: string;
  descripcion: string;
  fecha: string;
  referenciaId: string;
}

export interface IngresoMensual {
  mes: string;
  monto: number;
}

/** Ítem 321: punto de una serie mensual genérica (ej. % de ocupación histórica). */
export interface PuntoMensual {
  mes: string;
  valor: number;
}

export interface DashboardArrendador {
  ingresosMesActual: number;
  ingresosMesAnterior: number;
  tasaOcupacion: number;
  totalPropiedades: number;
  propiedadesActivas: number;
  vistasUltimos30Dias: number;
  mensajesSinLeer: number;
  reservasPendientes: number;
  reservasActivas: number;
  actividadReciente: ActividadReciente[];
  ingresosPorMes: IngresoMensual[];
  /** Ítem 321: ocupación histórica retroactiva (últimos ~7 meses), calculada desde reservas cerradas. */
  ocupacionPorMes: PuntoMensual[];
}

export const dashboardService = {
  obtenerMetricas: async (): Promise<DashboardArrendador> => {
    const { data } = await api.get<DashboardArrendador>('dashboard/arrendador');
    return data;
  },
};
