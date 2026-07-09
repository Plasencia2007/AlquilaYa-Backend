'use client';

import { CatalogosTable } from '@/components/admin/CatalogosTable';

export default function AdminCatalogTagsPage() {
  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-400">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-black text-foreground tracking-tighter">
          Gestor de Catálogos
        </h1>
        <p className="text-sm text-muted-foreground font-medium opacity-70">
          Administra servicios, reglas, tipos de cuarto, periodos y motivos de cancelación o rechazo.
        </p>
      </header>

      <CatalogosTable />
    </div>
  );
}
