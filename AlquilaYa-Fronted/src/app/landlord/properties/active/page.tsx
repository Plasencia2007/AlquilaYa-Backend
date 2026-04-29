'use client';
// Fuerza re-compilación para la nueva arquitectura de Perfil (Arrendador Id)

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { Modal } from '@/components/ui/Modal';
import { propiedadService } from '@/services/landlord-property-service';
import { useAuthStore } from '@/stores/auth-store';
import { notify } from '@/lib/notify';
import Link from 'next/link';

type PropiedadItem = {
  id: number | string;
  titulo: string;
  precio: number;
  direccion: string;
  estado: string;
  imagenUrl?: string;
};

export default function ActivePropertiesPage() {
  const { usuario } = useAuthStore();
  const [properties, setProperties] = useState<PropiedadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PropiedadItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProperties = async () => {
    if (!usuario || !usuario.perfilId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await propiedadService.obtenerPorArrendador(usuario.perfilId.toString());
      setProperties(data as unknown as PropiedadItem[]);
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
  }, [usuario, usuario?.perfilId]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return (
          <Badge variant="surface" className="bg-amber-100 text-amber-700 border-amber-200">
            En revisión
          </Badge>
        );
      case 'APROBADO':
      case 'ACTIVA':
        return (
          <Badge variant="surface" className="bg-emerald-100 text-emerald-700 border-emerald-200">
            Publicada
          </Badge>
        );
      case 'RECHAZADO':
        return (
          <Badge variant="surface" className="bg-rose-100 text-rose-700 border-rose-200">
            Rechazada
          </Badge>
        );
      default:
        return <Badge variant="surface">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-medium">Cargando tu inventario...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-fade-in">
      {/* Cabecera de Sección */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <Badge variant="surface" className="mb-2">
            Mis Publicaciones
          </Badge>
          <h1 className="text-4xl font-black text-on-surface tracking-tighter sm:text-5xl">
            Cuartos <span className="text-primary">Activos</span>
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-lg">
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
        <div className="p-4 bg-error/10 text-error rounded-2xl border border-error/20 mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Grid de Propiedades */}
      {properties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((prop) => (
            <Card
              key={prop.id}
              padding="none"
              className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-500 bg-surface-container-low hover:-translate-y-1"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                {prop.imagenUrl ? (
                  <img
                    src={prop.imagenUrl}
                    alt={prop.titulo}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-variant/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">
                      image
                    </span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {getStatusBadge(prop.estado)}
                </div>
                <div className="absolute top-3 right-3">
                  <div className="bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-full text-primary font-black text-sm shadow-lg">
                    S/ {prop.precio.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-black text-lg text-on-surface tracking-tight mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                  {prop.titulo}
                </h3>
                <div className="flex items-center gap-1.5 text-on-surface-variant text-sm mb-4">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  <span className="line-clamp-1">{prop.direccion}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full rounded-xl border border-surface-variant text-xs h-9"
                  >
                    <Link href={`/landlord/properties/edit/${prop.id}`}>
                      <span className="material-symbols-outlined text-base mr-2">edit</span>
                      Editar
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setConfirmDelete(prop)}
                    variant="ghost"
                    size="sm"
                    className="w-full rounded-xl text-xs h-9 text-error hover:bg-error/10 hover:text-error border border-error/20"
                  >
                    <span className="material-symbols-outlined text-base mr-2">delete</span>
                    Eliminar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-[2.5rem] p-12 text-center border-2 border-dashed border-surface-variant/50">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6 text-on-surface-variant/30">
            <span className="material-symbols-outlined text-4xl">inventory_2</span>
          </div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight mb-2">
            Aún no tienes publicaciones
          </h2>
          <p className="text-on-surface-variant max-w-sm mx-auto mb-8">
            Empieza a publicar tus habitaciones disponibles para que los estudiantes puedan
            encontrarte.
          </p>
          <Button asChild variant="dark" className="rounded-2xl h-12 px-8">
            <Link href="/landlord/properties/add">Empezar a publicar</Link>
          </Button>
        </div>
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => (deleting ? null : setConfirmDelete(null))}
        title="Eliminar propiedad"
        description={
          confirmDelete
            ? `¿Seguro que deseas eliminar "${confirmDelete.titulo}"? Esta acción no se puede deshacer.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="dark"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-error text-on-error hover:bg-error/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      />
    </div>
  );
}
