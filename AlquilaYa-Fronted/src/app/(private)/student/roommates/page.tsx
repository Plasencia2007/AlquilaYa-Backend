'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { notify } from '@/lib/notify';
import { RoommateCard } from '@/components/student/roommate-card';
import { roommateService, type PerfilConvivencia } from '@/services/roommate-service';

function SkeletonRoommateCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function RoommatesPage() {
  const [lista, setLista] = useState<PerfilConvivencia[]>([]);
  const [mi, setMi] = useState<PerfilConvivencia | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      roommateService.listarRoommates(),
      roommateService.miConvivencia().catch(() => null),
    ])
      .then(([l, m]) => {
        setLista(l);
        setMi(m);
      })
      .catch((e) => notify.error(e, 'No se pudieron cargar los compañeros.'))
      .finally(() => setCargando(false));
  }, []);

  const ordenados = useMemo(
    () =>
      lista.map((p) => ({
        p,
        c: p.compatibilidadScore !== undefined && p.compatibilidadNivel !== undefined
          ? { score: p.compatibilidadScore, nivel: p.compatibilidadNivel }
          : null,
      })),
    [lista],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 space-y-2">
        <h1 className="text-h1">
          Compañeros de cuarto
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Encuentra estudiantes que buscan roommate. La compatibilidad se calcula con tu perfil de convivencia.
        </p>
      </header>

      {!cargando && mi && !mi.buscaCompaneros && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">
            Activa <strong>“Estoy buscando compañeros”</strong> en tu perfil para aparecer aquí tú también.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/student/profile?tab=convivencia">Completar mi perfil</Link>
          </Button>
        </div>
      )}

      {cargando ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRoommateCard key={i} />
          ))}
        </div>
      ) : ordenados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Users className="size-10 text-muted-foreground" />
          <p className="font-bold text-foreground">Aún no hay nadie buscando compañeros</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Sé el primero: activa la búsqueda en tu perfil de convivencia y completa tus datos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordenados.map(({ p, c }) => (
            <RoommateCard key={p.estudianteId} perfil={p} compat={c} />
          ))}
        </div>
      )}
    </div>
  );
}
