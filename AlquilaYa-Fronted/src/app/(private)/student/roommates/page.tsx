'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { RoommateCard } from '@/components/student/roommate-card';
import { roommateService, type PerfilConvivencia } from '@/services/roommate-service';

const TAMANO_PAGINA = 12;
const FILTRO_TODAS = 'todas';
const FILTRO_TODOS = 'todos';
const PRESUPUESTOS_FILTRO = [300, 500, 800, 1200];

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
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  // Filtros (ítem 214): carrera y ciclo vienen del perfil académico de cada roommate
  // (ya incluidos en PerfilConvivenciaDTO); presupuesto usa rangos fijos.
  const [filtroCarrera, setFiltroCarrera] = useState(FILTRO_TODAS);
  const [filtroCiclo, setFiltroCiclo] = useState(FILTRO_TODOS);
  const [filtroPresupuesto, setFiltroPresupuesto] = useState(FILTRO_TODOS);
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      roommateService.listarRoommates(),
      roommateService.miConvivencia().catch(() => null),
    ])
      .then(([pagina_, m]) => {
        if (cancelado) return;
        setLista(pagina_.content);
        setMi(m);
        setError(false);
      })
      .catch(() => {
        if (!cancelado) setError(true);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [intento]);

  const cargar = useCallback(() => {
    setCargando(true);
    setIntento((i) => i + 1);
  }, []);

  const carrerasDisponibles = useMemo(
    () =>
      Array.from(new Set(lista.map((p) => p.carrera).filter((c): c is string => !!c))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [lista],
  );
  const ciclosDisponibles = useMemo(
    () =>
      Array.from(new Set(lista.map((p) => p.ciclo).filter((c): c is number => c != null))).sort((a, b) => a - b),
    [lista],
  );

  const hayFiltrosActivos =
    filtroCarrera !== FILTRO_TODAS || filtroCiclo !== FILTRO_TODOS || filtroPresupuesto !== FILTRO_TODOS;

  const limpiarFiltros = useCallback(() => {
    setFiltroCarrera(FILTRO_TODAS);
    setFiltroCiclo(FILTRO_TODOS);
    setFiltroPresupuesto(FILTRO_TODOS);
  }, []);

  // Filtro + orden real por compatibilidad descendente (antes solo hacía `.map()`, ítem 214).
  const ordenados = useMemo(() => {
    const filtrados = lista.filter((p) => {
      if (filtroCarrera !== FILTRO_TODAS && p.carrera !== filtroCarrera) return false;
      if (filtroCiclo !== FILTRO_TODOS && String(p.ciclo) !== filtroCiclo) return false;
      if (filtroPresupuesto !== FILTRO_TODOS) {
        const max = Number(filtroPresupuesto);
        if (p.presupuestoMax != null && p.presupuestoMax > max) return false;
      }
      return true;
    });

    return filtrados
      .map((p) => ({
        p,
        c:
          p.compatibilidadScore !== undefined && p.compatibilidadNivel !== undefined
            ? {
                score: p.compatibilidadScore,
                nivel: p.compatibilidadNivel,
                // Desglose calculado por el backend (ítem 215) — única fuente de verdad,
                // ya no se replica el algoritmo en el cliente.
                detalle: p.compatibilidadDesglose,
              }
            : null,
      }))
      .sort((a, b) => (b.c?.score ?? -1) - (a.c?.score ?? -1));
  }, [lista, filtroCarrera, filtroCiclo, filtroPresupuesto]);

  // Paginación en cliente (ítem 216): la página del backend ya trae "todo" (size grande) porque
  // los filtros de arriba deben aplicarse sobre el conjunto completo; acá solo se recorta la
  // vista. `paginaSegura` se ajusta sola si los filtros reducen el total (evita páginas vacías
  // sin necesitar un efecto que resetee estado).
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / TAMANO_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas - 1);
  const visibles = ordenados.slice(paginaSegura * TAMANO_PAGINA, (paginaSegura + 1) * TAMANO_PAGINA);

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

      {!cargando && !error && mi && !mi.buscaCompaneros && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">
            Activa <strong>“Estoy buscando compañeros”</strong> en tu perfil para aparecer aquí tú también.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/student/profile?tab=convivencia">Completar mi perfil</Link>
          </Button>
        </div>
      )}

      {!cargando && !error && lista.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-bold text-muted-foreground">Carrera</label>
            <Select value={filtroCarrera} onValueChange={setFiltroCarrera}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTRO_TODAS}>Todas las carreras</SelectItem>
                {carrerasDisponibles.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-bold text-muted-foreground">Ciclo</label>
            <Select value={filtroCiclo} onValueChange={setFiltroCiclo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTRO_TODOS}>Todos los ciclos</SelectItem>
                {ciclosDisponibles.map((c) => (
                  <SelectItem key={c} value={String(c)}>
                    Ciclo {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-bold text-muted-foreground">Presupuesto máximo</label>
            <Select value={filtroPresupuesto} onValueChange={setFiltroPresupuesto}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTRO_TODOS}>Cualquier presupuesto</SelectItem>
                {PRESUPUESTOS_FILTRO.map((v) => (
                  <SelectItem key={v} value={String(v)}>
                    Hasta S/ {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hayFiltrosActivos && (
            <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {cargando ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRoommateCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="No pudimos cargar los compañeros"
          description="Algo salió mal al buscar estudiantes disponibles."
          onRetry={cargar}
        />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no hay nadie buscando compañeros"
          description="Sé el primero: activa la búsqueda en tu perfil de convivencia y completa tus datos."
          action={{
            type: 'link',
            label: 'Completar mi perfil',
            href: '/student/profile?tab=convivencia',
          }}
        />
      ) : ordenados.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nadie coincide con estos filtros"
          description="Prueba con otra carrera, ciclo o presupuesto."
          action={{
            type: 'button',
            label: 'Limpiar filtros',
            onClick: limpiarFiltros,
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map(({ p, c }) => (
              <RoommateCard key={p.estudianteId} perfil={p} compat={c} />
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={paginaSegura === 0}
                className="gap-1"
              >
                <ChevronLeft className="size-4" /> Anterior
              </Button>
              <span className="text-sm font-semibold text-muted-foreground">
                Página {paginaSegura + 1} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaSegura >= totalPaginas - 1}
                className="gap-1"
              >
                Siguiente <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
