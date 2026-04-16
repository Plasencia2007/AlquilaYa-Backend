export interface MetricaAdmin {
  etiqueta: string;
  valor: string;
  cambio: number;
  etiquetaCambio: string;
}

export interface ActividadReciente {
  id: string;
  tipo: 'reserva' | 'registro' | 'verificacion' | 'alerta';
  descripcion: string;
  usuario: string;
  fechaHora: string;
  estado: 'ACTIVO' | 'PENDIENTE' | 'CRITICO';
}
