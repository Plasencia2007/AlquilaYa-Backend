'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { UserDirectoryTable } from '@/components/admin/UserDirectoryTable';

export default function AdminProvidersDirectoryPage() {
  return (
    <div className="space-y-5">
      {/* Banner de navegación hacia gestión completa */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800">Vista de solo consulta</p>
            <p className="text-xs text-slate-500 font-medium">
              Para gestión completa (validar, banear, revisar documentos) usa el módulo de Validaciones.
            </p>
          </div>
        </div>
        <Link
          href="/admin-master/validations/providers"
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-black rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all"
        >
          Ir a Validaciones <ArrowRight size={13} />
        </Link>
      </div>

      <UserDirectoryTable
        rol="ARRENDADOR"
        title="Arrendadores — Directorio"
        description="Consulta rápida de perfiles de arrendadores registrados en la plataforma."
      />
    </div>
  );
}
