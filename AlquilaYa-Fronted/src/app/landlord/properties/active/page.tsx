'use client';
// Fuerza re-compilación para la nueva arquitectura de Perfil (Arrendador Id)

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PropertyCard } from '@/features/landlord/components/PropertyCard';
import { propiedadService } from '@/features/landlord/services/propiedadService';
import { useAuthStore } from '@/features/auth/useAuthStore';
import Link from 'next/link';

export default function ActivePropertiesPage() {
  const { usuario } = useAuthStore();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      // Usar el perfilId para obtener las propiedades del negocio
      if (!usuario || !usuario.perfilId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const data = await propiedadService.obtenerPorArrendador(usuario.perfilId.toString());
        setProperties(data);
      } catch (err) {
        console.error('Error al cargar propiedades:', err);
        setError('No se pudieron cargar tus propiedades. Asegúrate de que el servidor esté activo.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [usuario, usuario?.perfilId]);

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
          <Badge variant="surface" className="mb-2">Mis Publicaciones</Badge>
          <h1 className="text-4xl font-black text-on-surface tracking-tighter sm:text-5xl">
            Cuartos <span className="text-primary">Activos</span>
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-lg">
            Aquí puedes gestionar la disponibilidad de tus habitaciones y ver el estado de tus publicaciones.
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
            <PropertyCard
              key={prop.id}
              titulo={prop.titulo}
              precio={prop.precio}
              direccion={prop.direccion}
              estado={prop.estado}
              imagenUrl={prop.imagenUrl} // Sincronizado con el backend
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-[2.5rem] p-12 text-center border-2 border-dashed border-surface-variant/50">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6 text-on-surface-variant/30">
            <span className="material-symbols-outlined text-4xl">inventory_2</span>
          </div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight mb-2">Aún no tienes publicaciones</h2>
          <p className="text-on-surface-variant max-w-sm mx-auto mb-8">
            Empieza a publicar tus habitaciones disponibles para que los estudiantes puedan encontrarte.
          </p>
          <Button asChild variant="dark" className="rounded-2xl h-12 px-8">
            <Link href="/landlord/properties/add">Empezar a publicar</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

