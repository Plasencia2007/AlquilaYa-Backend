import { AlertTriangle } from 'lucide-react';

export default function AlertsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-admin-text">Alertas de Inventario</h1>
        <p className="text-sm text-admin-text-muted mt-1">Reportes y alertas del sistema</p>
      </div>

      <div className="bg-admin-surface border border-admin-border rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-admin-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-admin-accent" />
        </div>
        <h2 className="text-lg font-semibold text-admin-text mb-2">Módulo en desarrollo</h2>
        <p className="text-sm text-admin-text-muted max-w-md mx-auto">
          Aquí se mostrarán alertas de propiedades reportadas, usuarios sospechosos y avisos del sistema.
        </p>
      </div>
    </div>
  );
}
