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
}

export const dashboardService = {
  obtenerMetricas: async (): Promise<DashboardArrendador> => {
    const { data } = await api.get<DashboardArrendador>('dashboard/arrendador');
    return data;
  },
};
