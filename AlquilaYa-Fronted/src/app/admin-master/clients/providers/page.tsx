'use client';

import { UserDirectoryTable } from '@/components/admin/UserDirectoryTable';

export default function AdminProvidersPage() {
  return (
    <div className="p-6">
      <UserDirectoryTable 
        rol="ARRENDADOR"
        title="Directorio de Proveedores"
        description="Gestión de perfiles de arrendadores y verificación de sus propiedades."
      />
    </div>
  );
}
