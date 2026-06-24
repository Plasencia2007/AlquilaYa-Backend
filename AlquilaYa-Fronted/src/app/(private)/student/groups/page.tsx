'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, UsersRound } from 'lucide-react';

import { notify } from '@/lib/notify';
import { grupoService, type GrupoRoommate } from '@/services/grupo-service';

export default function MisGruposPage() {
  const [grupos, setGrupos] = useState<GrupoRoommate[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    grupoService
      .mios()
      .then(setGrupos)
      .catch((e) => notify.error(e, 'No se pudieron cargar tus grupos.'))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Mis grupos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Grupos de roommates que creaste o a los que te uniste.</p>
      </header>

      {cargando ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
        </div>
      ) : grupos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <UsersRound className="size-10 text-muted-foreground" />
          <p className="font-bold text-foreground">Aún no estás en ningún grupo</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Arma un grupo desde la ficha de un departamento, o únete a uno desde Compañeros.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {grupos.map((g) => (
            <Link
              key={g.id}
              href={`/student/groups/${g.id}`}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-foreground">{g.nombre}</p>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {g.estado}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{g.propiedadTitulo}</p>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {g.cuposOcupados}/{g.cuposTotales} cupos
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
