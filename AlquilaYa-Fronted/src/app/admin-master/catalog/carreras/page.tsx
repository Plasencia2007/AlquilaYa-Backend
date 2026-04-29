'use client';

import { CarrerasTable } from '@/components/admin/CarrerasTable';

export default function AdminCarrerasPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
          Carreras profesionales
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestiona el catálogo de carreras disponibles en el registro de estudiantes.
        </p>
      </div>
      <CarrerasTable />
    </div>
  );
}
