'use client';
// Fuerza re-compilación para la nueva arquitectura de Perfil (Arrendador Id)

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditPropertyModal } from '@/components/landlord/edit-property-modal';
import { PropertyImageFallback } from '@/components/shared/property-image-fallback';
import { propiedadService } from '@/services/landlord-property-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatPEN } from '@/lib/money';
import { notify } from '@/lib/notify';
import Link from 'next/link';

type PropiedadItem = {
  id: number | string;
  titulo: string;
  precio: number;
  direccion: string;
  estado: string;
  imagenUrl?: string;
  /** Caducidad (#49): si true, el aviso necesita que el dueño confirme que sigue vigente. */
  requiereReconfirmacion?: boolean;
};

export default function ActivePropertiesPage() {
  const { usuario } = useAuthStore();
  const [properties, setProperties] = useState<PropiedadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PropiedadItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editProp, setEditProp] = useState<PropiedadItem | null>(null);

  const fetchProperties = async () => {
    if (!usuario) {
      setLoading(false);
      return;
    }
    const landlordId = usuario.perfilId ?? Number(usuario.id);
    if (!landlordId || Number.isNaN(landlordId)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await propiedadService.obtenerPorArrendador(landlordId.toString());
      // La portada real es la primera imagen por orden; el imagenUrl legacy puede estar
      // desfasado (apuntar a una foto ya borrada). Derivamos la portada de la lista.
      setProperties(
        data.map((p) => {
          const portada =
            (p.imagenes ?? [])
              .slice()
              .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))[0]?.url ?? p.imagenUrl;
          return { ...p, imagenUrl: portada } as unknown as PropiedadItem;
        }),
      );
    } catch (err) {
      console.error('Error al cargar propiedades:', err);
      setError('No se pudieron cargar tus propiedades. Asegúrate de que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await propiedadService.eliminar(confirmDelete.id);
      notify.success('Propiedad eliminada');
      setConfirmDelete(null);
      await fetchProperties();
    } catch (err) {
      notify.error(err, 'No se pudo eliminar la propiedad');
    } finally {
      setDeleting(false);
    }
  };

  const [confirmandoId, setConfirmandoId] = useState<number | string | null>(null);
  const handleConfirmarDisponibilidad = async (prop: PropiedadItem) => {
    try {
      setConfirmandoId(prop.id);
      await propiedadService.confirmarDisponibilidad(prop.id);
      notify.success('¡Gracias!', 'Tu aviso quedó confirmado como vigente.');
      setProperties((prev) =>
        prev.map((p) => (p.id === prop.id ? { ...p, requiereReconfirmacion: false } : p)),
      );
    } catch (err) {
      notify.error(err, 'No se pudo confirmar la disponibilidad');
    } finally {
      setConfirmandoId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-amber-600 px-2.5 py-1 rounded-full shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            En revisión
          </span>
        );
      case 'APROBADO':
      case 'ACTIVA':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-emerald-600 px-2.5 py-1 rounded-full shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            Publicada
          </span>
        );
      case 'RECHAZADO':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-rose-600 px-2.5 py-1 rounded-full shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            Rechazada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-muted-foreground px-2.5 py-1 rounded-full shadow-md">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Cargando tu inventario...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Cabecera de Sección */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <Badge variant="surface" className="mb-2">
            Mis Publicaciones
          </Badge>
          <h1 className="text-4xl font-black text-foreground tracking-tighter sm:text-5xl">
            Cuartos <span className="text-primary">Activos</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            Aquí puedes gestionar la disponibilidad de tus habitaciones y ver el estado de tus
            publicaciones.
          </p>
        </div>

        <Button asChild variant="dark" className="h-12 px-6 rounded-2xl font-bold gap-2">
          <Link href="/landlord/properties/add">
            <span className="material-symbols-outlined">add</span>
            Publicar Nuevo
          </Link>
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Grid de Propiedades */}
      {properties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {properties.map((prop) => (
            <Card
              key={prop.id}
              padding="none"
              className="group overflow-hidden rounded-3xl border-0 shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 bg-white"
            >
              {/* ── Image area ─────────────────────────────────── */}
              <div className="relative aspect-[3/2] overflow-hidden rounded-t-3xl">
                <PropertyImageFallback src={prop.imagenUrl} alt={prop.titulo} />

                {/* Deep gradient overlay — bottom two-thirds */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Top tint strip for badge legibility */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent" />

                {/* Status badge — top left */}
                <div className="absolute top-3 left-3 z-10">
                  {getStatusBadge(prop.estado)}
                </div>

                {/* Price pill — bottom right */}
                <div className="absolute bottom-3 right-3 z-10">
                  <span className="inline-flex items-baseline gap-0.5 font-black text-white text-[15px] px-3.5 py-1.5 rounded-2xl shadow-xl bg-primary">
                    {formatPEN(prop.precio)}
                    <span className="text-[10px] font-medium text-white/70 ml-0.5">/mes</span>
                  </span>
                </div>

                {/* Bottom-left faint location ghost text on image */}
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 max-w-[60%]">
                  <span className="material-symbols-outlined text-white/80 text-[13px] shrink-0">location_on</span>
                  <span className="text-white/80 text-[11px] font-medium line-clamp-1 drop-shadow">
                    {prop.direccion}
                  </span>
                </div>
              </div>

              {/* ── Card body ──────────────────────────────────── */}
              <div className="px-5 pt-4 pb-1 bg-white">
                <h3 className="font-extrabold text-[15px] text-gray-900 line-clamp-1 leading-snug tracking-tight">
                  {prop.titulo}
                </h3>

                {/* Subtle accent underline */}
                <div className="mt-1.5 mb-3 h-0.5 w-10 rounded-full bg-primary" />

                {/* Location row */}
                <div className="flex items-center gap-1.5 text-gray-500 mb-4">
                  <span className="material-symbols-outlined text-[15px] shrink-0 text-primary">location_on</span>
                  <p className="text-xs line-clamp-1 font-medium">{prop.direccion}</p>
                </div>

                {/* Caducidad (#49): pide reconfirmar que el aviso sigue vigente */}
                {prop.requiereReconfirmacion && (
                  <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
                    <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800">
                      <span className="material-symbols-outlined text-[15px] shrink-0">schedule</span>
                      ¿Sigue disponible? Confírmalo para mantener tu aviso al día.
                    </p>
                    <Button
                      type="button"
                      onClick={() => handleConfirmarDisponibilidad(prop)}
                      disabled={confirmandoId === prop.id}
                      size="sm"
                      className="mt-2 h-8 w-full rounded-lg bg-amber-500 text-[11px] font-bold text-white hover:bg-amber-600 border-0"
                    >
                      {confirmandoId === prop.id ? 'Confirmando…' : 'Confirmar disponibilidad'}
                    </Button>
                  </div>
                )}
              </div>

              {/* ── Divider ────────────────────────────────────── */}
              <div className="h-px mx-0 bg-primary/10" />

              {/* ── Analítica (#51–55) ─────────────────────────── */}
              <Link
                href={`/landlord/properties/${prop.id}/analytics?titulo=${encodeURIComponent(prop.titulo)}`}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">monitoring</span>
                Ver analítica
              </Link>

              {/* ── Divider ────────────────────────────────────── */}
              <div className="h-px mx-0 bg-primary/10" />

              {/* ── Action row ─────────────────────────────────── */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white">
                <Button
                  type="button"
                  onClick={() => setEditProp(prop)}
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-9 rounded-xl text-xs font-bold gap-1.5 justify-center text-white border-0"
                  style={{ background: '#1e3a5f' }}
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  Editar
                </Button>

                <Button
                  type="button"
                  onClick={() => setConfirmDelete(prop)}
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-9 rounded-xl text-xs font-bold gap-1.5 justify-center text-white border-0"
                  style={{ background: '#dc2626' }}
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-muted rounded-[2.5rem] p-12 text-center border-2 border-dashed border-border-variant/50">
          <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
            <span className="material-symbols-outlined text-4xl">inventory_2</span>
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">
            Aún no tienes publicaciones
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8">
            Empieza a publicar tus habitaciones disponibles para que los estudiantes puedan
            encontrarte.
          </p>
          <Button asChild variant="dark" className="rounded-2xl h-12 px-8">
            <Link href="/landlord/properties/add">Empezar a publicar</Link>
          </Button>
        </div>
      )}

      <EditPropertyModal
        prop={editProp}
        onClose={() => setEditProp(null)}
        onSaved={fetchProperties}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => {
          if (!v && !deleting) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar propiedad</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete &&
                `¿Seguro que deseas eliminar "${confirmDelete.titulo}"? Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setConfirmDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
