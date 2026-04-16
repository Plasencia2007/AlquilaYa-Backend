import { BarChart3 } from 'lucide-react';

export default function MetricsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-admin-text">Métricas de Ventas</h1>
        <p className="text-sm text-admin-text-muted mt-1">Análisis de rendimiento de la plataforma</p>
      </div>

      <div className="bg-admin-surface border border-admin-border rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-admin-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-admin-accent" />
        </div>
        <h2 className="text-lg font-semibold text-admin-text mb-2">Módulo en desarrollo</h2>
        <p className="text-sm text-admin-text-muted max-w-md mx-auto">
          Aquí se mostrarán gráficos de ingresos, reservas por mes, tasa de conversión y tendencias de crecimiento.
        </p>
      </div>
    </div>
  );
}
