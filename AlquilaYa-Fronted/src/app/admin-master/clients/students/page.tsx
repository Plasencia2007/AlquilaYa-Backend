'use client';

import { UserDirectoryTable } from '@/components/admin/UserDirectoryTable';

export default function AdminStudentsPage() {
  return (
    <div className="p-6">
      <UserDirectoryTable 
        rol="ESTUDIANTE"
        title="Directorio de Estudiantes"
        description="Gestión de perfiles de estudiantes y sus historiales de búsqueda."
      />
    </div>
  );
}
