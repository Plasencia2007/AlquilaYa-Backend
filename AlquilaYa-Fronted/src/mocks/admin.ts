import { MetricaAdmin, ActividadReciente } from '@/types/admin';

export const METRICAS_ADMIN: MetricaAdmin[] = [
  { etiqueta: 'Usuarios Activos', valor: '2,847', cambio: 12.5, etiquetaCambio: 'vs mes anterior' },
  { etiqueta: 'Inmuebles Listados', valor: '1,234', cambio: 8.2, etiquetaCambio: 'vs mes anterior' },
  { etiqueta: 'Reservas del Mes', valor: '486', cambio: -3.1, etiquetaCambio: 'vs mes anterior' },
  { etiqueta: 'Ingresos Plataforma', valor: 'S/ 48,520', cambio: 15.7, etiquetaCambio: 'vs mes anterior' },
];

export const ACTIVIDADES_RECIENTES: ActividadReciente[] = [
  { id: '1', tipo: 'reserva', descripcion: 'Nueva reserva en Cuarto Luminoso - Miraflores', usuario: 'Carlos E.', fechaHora: 'Hace 5 min', estado: 'ACTIVO' },
  { id: '2', tipo: 'registro', descripcion: 'Nuevo proveedor registrado', usuario: 'Ana Torres', fechaHora: 'Hace 15 min', estado: 'PENDIENTE' },
  { id: '3', tipo: 'verificacion', descripcion: 'Propiedad en Barranco requiere verificación', usuario: 'Sistema', fechaHora: 'Hace 1 hora', estado: 'PENDIENTE' },
  { id: '4', tipo: 'alerta', descripcion: 'Reporte de usuario sobre propiedad #45', usuario: 'Pedro M.', fechaHora: 'Hace 2 horas', estado: 'CRITICO' },
  { id: '5', tipo: 'reserva', descripcion: 'Reserva confirmada - Estudio San Isidro', usuario: 'Laura G.', fechaHora: 'Hace 3 horas', estado: 'ACTIVO' },
  { id: '6', tipo: 'registro', descripcion: 'Nuevo estudiante registrado', usuario: 'Diego R.', fechaHora: 'Hace 4 horas', estado: 'ACTIVO' },
];

export const METRICAS_LATERALES = {
  proveedoresPendientes: 5,
  inmueblesPorRevisar: 12,
  denunciasPendientes: 2,
  anunciosPremium: 3,
  finanzasPendientes: 3,
  alertasSistema: 1,
};
