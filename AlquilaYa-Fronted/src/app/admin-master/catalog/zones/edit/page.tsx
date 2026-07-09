'use client';

import { UniversidadesTable } from '@/components/admin/UniversidadesTable';

export default function AdminZonasUniversitariasPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
          Zonas universitarias
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Administra las universidades y sus áreas de cobertura (radio o polígono) cerca del campus.
        </p>
      </div>
      <UniversidadesTable />
    </div>
  );
}
