'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import { RoommateCard } from '@/components/student/roommate-card';
import { compatibilidad, roommateService, type PerfilConvivencia } from '@/services/roommate-service';

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
      lista
        .map((p) => ({ p, c: compatibilidad(mi, p) }))
        .sort((a, b) => (b.c?.score ?? 0) - (a.c?.score ?? 0)),
    [lista, mi],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 space-y-2">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
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
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
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
