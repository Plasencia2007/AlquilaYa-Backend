'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, UserPlus, UsersRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { notify } from '@/lib/notify';
import { grupoService, type GrupoRoommate } from '@/services/grupo-service';

/**
 * Sección "buscar compañeros para este depa" (#38 Fase 1b). Solo para estudiantes
 * autenticados (evita llamadas 401 de visitantes anónimos).
 */
export function RoommateGroupsSection({ propiedadId }: { propiedadId: string | number }) {
  const { usuario, estaAutenticado } = useAuth();
  const router = useRouter();
  const [grupos, setGrupos] = useState<GrupoRoommate[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);

  const esEstudiante = estaAutenticado && usuario?.rol === 'ESTUDIANTE';

  useEffect(() => {
    if (!esEstudiante) {
      setCargando(false);
      return;
    }
    grupoService
      .abiertosDePropiedad(propiedadId)
      .then(setGrupos)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [esEstudiante, propiedadId]);

  if (!esEstudiante || cargando) return null;

  const crear = async () => {
    setCreando(true);
    try {
      const g = await grupoService.crear({ propiedadId });
      router.push(`/student/groups/${g.id}`);
    } catch (err) {
      notify.error(err, 'No se pudo crear el grupo.');
      setCreando(false);
    }
  };

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <UsersRound className="size-5 text-primary" />
        <h3 className="font-bold text-foreground">¿Te falta compañero?</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Arma un grupo para alquilar este depa entre varios y dividir el costo.
      </p>

      {grupos.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Grupos buscando compañeros
          </p>
          {grupos.map((g) => (
            <Link
              key={g.id}
              href={`/student/groups/${g.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm transition hover:border-primary/40"
            >
              <span className="truncate font-semibold text-foreground">{g.nombre}</span>
              <span className="shrink-0 text-xs font-bold text-primary">
                {g.cuposOcupados}/{g.cuposTotales}
              </span>
            </Link>
          ))}
        </div>
      )}

      <Button onClick={crear} disabled={creando} className="mt-4 w-full gap-1.5 font-bold">
        {creando ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        Armar un grupo
      </Button>
    </section>
  );
}
