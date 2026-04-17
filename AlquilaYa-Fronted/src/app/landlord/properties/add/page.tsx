'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { propiedadService } from '@/features/landlord/services/propiedadService';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddPropertyPage() {
  const router = useRouter();
  const { usuario } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    precio: '',
    direccion: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !usuario) {
      setError('Por favor, selecciona una imagen y asegúrate de estar logueado.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const propiedadRequest = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        precio: parseFloat(formData.precio),
        direccion: formData.direccion,
        arrendadorId: usuario.id,
      };

      await propiedadService.crearPropiedad(propiedadRequest, imageFile);
      router.push('/landlord/properties/active');
    } catch (err: any) {
      console.error('Error al crear propiedad:', err);
      setError('Hubo un error al publicar la propiedad. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/landlord/dashboard" className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <Badge variant="surface" className="mb-1">Publicación Nueva</Badge>
          <h1 className="text-4xl font-black text-on-surface tracking-tighter">Publicar mi cuarto</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Datos */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-surface-container-low">
            <div className="mb-6">
              <h3 className="text-xl font-black text-on-surface tracking-tight">Información General</h3>
              <p className="text-sm text-on-surface-variant">Describe los detalles más importantes de tu propiedad.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface-variant px-1">Título del anuncio</label>
                <Input
                  required
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleInputChange}
                  placeholder="Ej: Cuarto acogedor cerca de la universidad"
                  className="bg-surface border-none focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface-variant px-1">Descripción detallada</label>
                <textarea
                  required
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Describe las reglas, servicios incluidos, etc..."
                  className="w-full min-h-[120px] rounded-xl bg-surface border-none p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">Precio mensual (S/)</label>
                  <Input
                    required
                    type="number"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    placeholder="Ej: 450"
                    className="bg-surface border-none focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">Dirección exacta</label>
                  <Input
                    required
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    placeholder="Ej: Av. Las Flores 123, Cayma"
                    className="bg-surface border-none focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Columna Derecha: Multimedia y Acciones */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-surface-container-low overflow-hidden">
            <div className="mb-4">
              <h3 className="text-lg font-black text-on-surface tracking-tight">Foto de portada</h3>
            </div>
            
            <div className="space-y-4">
              <div
                className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden 
                  ${preview ? 'border-transparent' : 'border-surface-variant hover:border-primary/50 bg-surface/50'}`}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="Vista previa" className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPreview(null); setImageFile(null); }}
                      className="absolute top-2 right-2 p-2 bg-error/90 text-on-error rounded-full shadow-lg hover:scale-110 transition-transform z-10"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </>
                ) : (
                  <div className="text-center p-6">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">add_a_photo</span>
                    <p className="text-xs text-on-surface-variant font-medium">Click para subir foto</p>
                    <input
                      required
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant text-center">
                JPG, PNG o WEBP. Máximo 5MB.
              </p>
            </div>
          </Card>

          <div className="space-y-3">
            {error && (
              <div className="p-3 bg-error/10 text-error text-xs rounded-xl border border-error/20 animate-shake">
                {error}
              </div>
            )}
            
            <Button
              type="submit"
              disabled={loading}
              variant="dark"
              className="w-full h-12 text-base font-bold rounded-2xl"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-on border-t-transparent rounded-full animate-spin" />
                  Publicando...
                </div>
              ) : (
                'Publicar Propiedad'
              )}
            </Button>
            
            <Button asChild variant="ghost" className="w-full rounded-2xl border border-surface-variant">
              <Link href="/landlord/dashboard">Cancelar</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
