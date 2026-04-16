import { Users } from 'lucide-react';

export default function ClientsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-admin-text">Directorio de Clientes</h1>
        <p className="text-sm text-admin-text-muted mt-1">Gestiona los usuarios de la plataforma</p>
      </div>

      <div className="bg-admin-surface border border-admin-border rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-admin-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-admin-accent" />
        </div>
        <h2 className="text-lg font-semibold text-admin-text mb-2">Módulo en desarrollo</h2>
        <p className="text-sm text-admin-text-muted max-w-md mx-auto">
          Aquí se mostrará el directorio de clientes con filtros avanzados, estados de cuenta y acciones de gestión.
        </p>
      </div>
    </div>
  );
}
