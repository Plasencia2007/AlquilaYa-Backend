'use client';

import { UserDirectoryTable } from '@/components/admin/UserDirectoryTable';

export default function AdminStaffPage() {
  return (
    <div className="p-6">
      <UserDirectoryTable 
        rol="ADMIN"
        title="Staff / Administradores"
        description="Gestión del equipo administrativo y personal con acceso al sistema."
      />
    </div>
  );
}
