'use client';

import React, { useEffect, useState } from 'react';
import { catalogService, type ItemCatalogo, type ItemCatalogoInput, type TipoItemCatalogo } from '@/services/catalog-service';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { Input } from '@/components/ui/legacy-input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { resolveIcon } from '@/lib/icons';
import { notify } from '@/lib/notify';
import { useConfirm } from '@/hooks/use-confirm';

const TIPO_LABELS: Record<TipoItemCatalogo, string> = {
  SERVICIO: 'Servicios',
  REGLA: 'Reglas de Convivencia',
  TIPO_CUARTO: 'Tipos de Inmueble',
  PERIODO_ALQUILER: 'Periodos de Alquiler',
  MOTIVO_CANCELACION: 'Motivos de Cancelación',
  MOTIVO_RECHAZO: 'Motivos de Rechazo',
  BANNER: 'Banners Informativos',
};

const PRESET_ICONS = [
  // --- SERVICIOS Y COMODIDADES ---
  { id: 'fa-wifi', name: 'Wifi', type: 'fa' },
  { id: 'fa-tint', name: 'Agua Caliente', type: 'fa' },
  { id: 'fa-bolt', name: 'Electricidad', type: 'fa' },
  { id: 'fa-lightbulb', name: 'Luz/Iluminación', type: 'fa' },
  { id: 'fa-tshirt', name: 'Lavandería', type: 'fa' },
  { id: 'local_laundry_service', name: 'Lavadora', type: 'material' },
  { id: 'fa-utensils', name: 'Cocina/Comedor', type: 'fa' },
  { id: 'fa-key', name: 'Llave/Ingreso', type: 'fa' },
  { id: 'fa-wind', name: 'Ventilación/Aire', type: 'fa' },
  { id: 'fa-tv', name: 'Televisor', type: 'fa' },
  { id: 'fa-snowflake', name: 'Aire Acondicionado', type: 'fa' },
  { id: 'fa-parking', name: 'Cochera', type: 'fa' },
  { id: 'fa-shower', name: 'Ducha', type: 'fa' },
  { id: 'fa-bath', name: 'Bañera/Tina', type: 'fa' },
  { id: 'fa-couch', name: 'Amoblado/Sofá', type: 'fa' },
  { id: 'fa-bed', name: 'Cama/Dormitorio', type: 'fa' },
  { id: 'single_bed', name: 'Cama Individual', type: 'material' },
  { id: 'kitchen', name: 'Refrigeradora/Cocina', type: 'material' },
  { id: 'microwave', name: 'Microondas', type: 'material' },
  { id: 'elevator', name: 'Ascensor', type: 'material' },
  { id: 'balcony', name: 'Balcón', type: 'material' },
  { id: 'yard', name: 'Patio/Jardín', type: 'material' },
  { id: 'videocam', name: 'Cámaras/Seguridad', type: 'material' },
  { id: 'cleaning_services', name: 'Servicio de Limpieza', type: 'material' },

  // --- REGLAS Y CONVIVENCIA ---
  { id: 'fa-paw', name: 'Mascotas', type: 'fa' },
  { id: 'fa-smoking-ban', name: 'Prohibido Fumar', type: 'fa' },
  { id: 'fa-graduation-cap', name: 'Estudiantes', type: 'fa' },
  { id: 'fa-clock', name: 'Horarios/Reloj', type: 'fa' },
  { id: 'fa-volume-mute', name: 'Silencio', type: 'fa' },
  { id: 'fa-glass-cheers', name: 'Fiestas/Bebidas', type: 'fa' },
  { id: 'fa-music', name: 'Música/Ruido', type: 'fa' },
  { id: 'smoke_free', name: 'Libre de Humo', type: 'material' },
  { id: 'volume_off', name: 'Sin Ruido', type: 'material' },
  { id: 'celebration', name: 'Celebración', type: 'material' },
  { id: 'group', name: 'Visitas Permitidas', type: 'material' },
  { id: 'work', name: 'Zona de Estudio/Trabajo', type: 'material' },

  // --- MOTIVOS Y ESTADOS ---
  { id: 'fa-ban', name: 'Bloqueado/Rechazado', type: 'fa' },
  { id: 'fa-user-times', name: 'Incompatible', type: 'fa' },
  { id: 'fa-wrench', name: 'Mantenimiento', type: 'fa' },
  { id: 'fa-comments-slash', name: 'Sin Comunicación', type: 'fa' },
  { id: 'fa-plane-slash', name: 'Viaje Cancelado', type: 'fa' },
  { id: 'fa-heartbeat', name: 'Salud', type: 'fa' },
  { id: 'fa-calendar-times', name: 'Sin Disponibilidad', type: 'fa' },
  { id: 'fa-exclamation-circle', name: 'Error/Advertencia', type: 'fa' },
  { id: 'warning', name: 'Advertencia', type: 'material' },
  { id: 'error', name: 'Error', type: 'material' },
  { id: 'person_remove', name: 'Remover Persona', type: 'material' },
  { id: 'build', name: 'Herramientas', type: 'material' },
  { id: 'event_busy', name: 'Fechas Ocupadas', type: 'material' },

  // --- MARKETING Y BANNERS ---
  { id: 'local_offer', name: 'Descuento/Oferta', type: 'material' },
  { id: 'verified_user', name: 'Verificado', type: 'material' },
  { id: 'campaign', name: 'Campaña/Anuncio', type: 'material' },
  { id: 'info', name: 'Información', type: 'material' },
  { id: 'star', name: 'Premium/Estrella', type: 'material' },
  { id: 'home', name: 'Casa/Alojamiento', type: 'material' },
  { id: 'notifications', name: 'Campana/Alerta', type: 'material' },
  { id: 'help', name: 'Ayuda/Soporte', type: 'material' },
  { id: 'percent', name: 'Porcentaje', type: 'material' },
  { id: 'payments', name: 'Método de Pago', type: 'material' },
  { id: 'price_change', name: 'Cambio de Precio', type: 'material' },
  { id: 'handshake', name: 'Trato/Acuerdo', type: 'material' },
  { id: 'badge', name: 'DNI/Credencial', type: 'material' },
  { id: 'mail', name: 'Correo/Inbox', type: 'material' },
];


type DialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; item: ItemCatalogo };

const emptyForm = (tipo: TipoItemCatalogo): ItemCatalogoInput => ({
  nombre: '',
  valor: '',
  tipo,
  icono: '',
  descripcion: '',
  imagenUrl: '',
  activo: true,
});

/** Validación mínima: solo aceptamos http(s) para previsualizar la imagen del banner. */
const pareceUrl = (v: string): boolean => /^https?:\/\/.+/i.test(v.trim());

export const CatalogosTable: React.FC = () => {
  const [items, setItems] = useState<ItemCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<TipoItemCatalogo>('SERVICIO');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });
  const [form, setForm] = useState<ItemCatalogoInput>(emptyForm('SERVICIO'));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Se activa si el navegador no logra cargar la imagen del banner (URL rota) para ocultar el preview.
  const [bannerImgError, setBannerImgError] = useState(false);
  // true mientras se sube un archivo de imagen del banner a Cloudinary.
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const load = async () => {
    try {
      setLoading(true);
      const data = await catalogService.listarFiltros();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm(selectedType));
    setError(null);
    setBannerImgError(false);
    setDialog({ mode: 'create' });
  };

  const openEdit = (item: ItemCatalogo) => {
    setForm({
      nombre: item.nombre,
      valor: item.valor,
      tipo: item.tipo,
      icono: item.icono || '',
      descripcion: item.descripcion || '',
      imagenUrl: item.imagenUrl || '',
      activo: item.activo,
    });
    setError(null);
    setBannerImgError(false);
    setDialog({ mode: 'edit', item });
  };

  const closeDialog = () => {
    setDialog({ mode: 'closed' });
    setForm(emptyForm(selectedType));
    setError(null);
    setBannerImgError(false);
    setSubiendoImagen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || form.nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (!form.valor || form.valor.trim().length < 2) {
      setError('El código / valor es obligatorio');
      return;
    }
    try {
      setSaving(true);
      const payload: ItemCatalogoInput = {
        nombre: form.nombre.trim(),
        // Los códigos de catálogo (WIFI, NO_MASCOTAS...) se normalizan a mayúsculas,
        // pero en BANNER el `valor` es una ruta/clave libre (p.ej. `/search`, o
        // `hero-home` que el hero busca en minúsculas) — se preserva tal cual.
        valor:
          form.tipo === 'BANNER'
            ? form.valor.trim()
            : form.valor.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_'),
        tipo: form.tipo,
        icono: form.icono?.trim() || undefined,
        descripcion: form.descripcion?.trim() || undefined,
        activo: form.activo,
        // La imagen del hero solo tiene sentido para banners; no ensuciamos otros tipos.
        ...(form.tipo === 'BANNER'
          ? { imagenUrl: form.imagenUrl?.trim() || undefined }
          : {}),
      };

      if (dialog.mode === 'create') {
        await catalogService.crearFiltro(payload);
        notify.success('Elemento creado correctamente');
      } else if (dialog.mode === 'edit') {
        await catalogService.actualizarFiltro(dialog.item.id, payload);
        notify.success('Elemento actualizado correctamente');
      }
      await load();
      closeDialog();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'No se pudo guardar el elemento';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  /** Sube el archivo elegido a Cloudinary y setea la URL devuelta como imagen del banner. */
  const handleImagenChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reseteamos el input para poder re-elegir el mismo archivo si falla.
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify.error(new Error('El archivo debe ser una imagen (JPG, PNG, WEBP, etc.)'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error(new Error('La imagen supera el tamaño máximo permitido (5 MB)'));
      return;
    }

    try {
      setSubiendoImagen(true);
      const url = await catalogService.subirImagenBanner(file);
      setBannerImgError(false);
      setForm((prev) => ({ ...prev, imagenUrl: url }));
      notify.success('Imagen subida correctamente');
    } catch (err) {
      notify.error(err, 'No se pudo subir la imagen');
    } finally {
      setSubiendoImagen(false);
    }
  };

  const handleDelete = (id: number) => {
    confirm({
      title: '¿Eliminar este elemento del catálogo?',
      description: 'Esta acción no se puede deshacer.',
      tone: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          setDeletingId(id);
          await catalogService.eliminarFiltro(id);
          notify.success('Elemento eliminado correctamente');
          await load();
        } catch (err) {
          notify.error(err, 'No se pudo eliminar el elemento');
          return false;
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const filteredItems = items.filter((item) => {
    if (item.tipo !== selectedType) return false;
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    return (
      item.nombre.toLowerCase().includes(search) ||
      item.valor.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Category selector */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-border/60">
        {(Object.keys(TIPO_LABELS) as TipoItemCatalogo[]).map((t) => (
          <Button
            key={t}
            variant={selectedType === t ? 'primary' : 'ghost'}
            onClick={() => setSelectedType(t)}
            className="rounded-full text-xs font-bold px-4 h-9"
          >
            {TIPO_LABELS[t]}
          </Button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <span className="material-symbols-outlined text-[18px] text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 select-none">
            search
          </span>
          <Input
            placeholder="Buscar por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openCreate} className="h-10 gap-1.5 font-bold text-xs shrink-0 self-start sm:self-auto">
          <span className="material-symbols-outlined text-[16px]">add</span>
          Crear elemento
        </Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Cargando catálogo...
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground border border-dashed">
          No hay elementos definidos para este catálogo. ¡Crea el primero!
        </Card>
      ) : (
        <Card padding="none" className="border border-border/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-black uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Nombre (Visual)</th>
                  <th className="px-5 py-4">Código (Valor)</th>
                  <th className="px-5 py-4">Ícono</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-4 font-bold text-muted-foreground">{item.id}</td>
                    <td className="px-5 py-4 font-black text-foreground">{item.nombre}</td>
                    <td className="px-5 py-4">
                      <code className="bg-primary/5 text-primary border border-primary/10 rounded px-2 py-0.5 font-mono font-bold text-[10px]">
                        {item.valor}
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      {item.icono ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px]">
                          <span className="material-symbols-outlined text-[14px]">
                            {resolveIcon(item.icono)}
                          </span>
                          {item.icono}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 italic">Ninguno</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={item.activo ? 'success' : 'outline'} className="h-5 px-2">
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right space-x-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                        aria-label={`Editar ${item.nombre}`}
                        title="Editar"
                        className="h-11 w-11 text-muted-foreground hover:text-foreground"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Eliminar ${item.nombre}`}
                        title="Eliminar"
                        className="h-11 w-11 text-red-500 hover:bg-red-500/10"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* dialog modal form */}
      <Dialog open={dialog.mode !== 'closed'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'create' ? 'Crear nuevo elemento' : 'Editar elemento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {error && (
              // Ítem 406: `role="alert"` hace que un lector de pantalla lo anuncie apenas
              // aparece (se monta condicionalmente), sin depender de que el foco esté aquí.
              // El id se referencia desde `aria-describedby` en los campos que puede señalar
              // (nombre / valor), ya que es un único mensaje que cubre validaciones de ambos.
              <div
                id="catalogo-form-error"
                role="alert"
                className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl px-4 py-2.5 text-xs font-semibold"
              >
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Tipo de Catálogo
              </Label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value as TipoItemCatalogo }))}
                className="h-11 w-full rounded-xl border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Object.entries(TIPO_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-nombre" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {form.tipo === 'BANNER' ? 'Título del Banner' : 'Nombre'}
              </Label>
              <Input
                id="item-nombre"
                placeholder={form.tipo === 'BANNER' ? 'Ej. ¡Descuento de Temporada!' : 'Ej. WiFi de Alta Velocidad'}
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                aria-describedby={error ? 'catalogo-form-error' : undefined}
                required
              />
            </div>

            {form.tipo === 'BANNER' && (
              <div className="space-y-1.5">
                <Label htmlFor="item-descripcion" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Descripción
                </Label>
                <textarea
                  id="item-descripcion"
                  rows={2}
                  placeholder="Ej. Obtén 50% de descuento en la comisión..."
                  value={form.descripcion || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full rounded-xl bg-muted border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                />
              </div>
            )}

            {form.tipo === 'BANNER' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Imagen del banner
                </Label>

                {/* Uploader real: sube el archivo a Cloudinary y setea la URL devuelta. */}
                <label
                  className={`flex items-center justify-center gap-2 h-11 w-full rounded-xl border border-dashed border-border bg-muted/40 px-3 text-xs font-semibold text-muted-foreground transition-colors ${
                    subiendoImagen
                      ? 'opacity-60 cursor-not-allowed'
                      : 'cursor-pointer hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {subiendoImagen ? 'progress_activity' : 'upload'}
                  </span>
                  {subiendoImagen ? 'Subiendo imagen…' : 'Subir imagen desde tu equipo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={subiendoImagen}
                    onChange={handleImagenChange}
                  />
                </label>

                <div className="flex items-center gap-2 py-0.5">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
                    o pega una URL
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                <Input
                  id="item-imagen"
                  type="url"
                  inputMode="url"
                  placeholder="https://res.cloudinary.com/.../banner.jpg"
                  value={form.imagenUrl || ''}
                  onChange={(e) => {
                    setBannerImgError(false);
                    setForm((prev) => ({ ...prev, imagenUrl: e.target.value }));
                  }}
                  aria-describedby={[
                    'item-imagen-ayuda',
                    form.imagenUrl?.trim() && !pareceUrl(form.imagenUrl) ? 'item-imagen-formato-error' : null,
                    bannerImgError ? 'item-imagen-carga-error' : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-invalid={bannerImgError || (!!form.imagenUrl?.trim() && !pareceUrl(form.imagenUrl))}
                />
                <p id="item-imagen-ayuda" className="text-[9px] text-muted-foreground/60">
                  Sube un archivo (se hospeda en Cloudinary) o pega un enlace directo a la imagen. Se usa como fondo del hero.
                </p>

                {form.imagenUrl && pareceUrl(form.imagenUrl) && !bannerImgError && (
                  <div className="mt-1 overflow-hidden rounded-xl border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.imagenUrl.trim()}
                      alt="Vista previa del banner"
                      onError={() => setBannerImgError(true)}
                      className="h-28 w-full object-cover"
                    />
                  </div>
                )}

                {form.imagenUrl?.trim() && !pareceUrl(form.imagenUrl) && (
                  <p id="item-imagen-formato-error" role="alert" className="text-[9px] font-semibold text-amber-600">
                    El enlace debería empezar con http:// o https://
                  </p>
                )}

                {bannerImgError && (
                  <p id="item-imagen-carga-error" role="alert" className="text-[9px] font-semibold text-red-500">
                    No se pudo cargar la imagen desde esa URL. Verifica el enlace.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="item-valor" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {form.tipo === 'BANNER' ? 'Ruta de redirección (Enlace)' : 'Código único (Valor)'}
              </Label>
              <Input
                id="item-valor"
                placeholder={form.tipo === 'BANNER' ? 'Ej. /search o /student/profile' : 'Ej. WIFI / NO_MASCOTAS / NO_DISPONIBLE'}
                value={form.valor}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    valor: form.tipo === 'BANNER'
                      ? e.target.value
                      : e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
                  }))
                }
                aria-describedby={[
                  form.tipo !== 'BANNER' ? 'item-valor-ayuda' : null,
                  error ? 'catalogo-form-error' : null,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined}
                required
              />
              {form.tipo !== 'BANNER' && (
                <p id="item-valor-ayuda" className="text-[9px] text-muted-foreground/60">
                  Se almacena en mayúsculas y sin espacios. Ej: `INCONVENIENTE_FECHAS`.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-icono" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Ícono
              </Label>
              <div className="flex gap-2">
                <Input
                  id="item-icono"
                  placeholder="Ej. fa-wifi o verified_user"
                  value={form.icono}
                  onChange={(e) => setForm((prev) => ({ ...prev, icono: e.target.value }))}
                  className="flex-1"
                />
                {form.icono && (
                  <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl text-primary">
                      {resolveIcon(form.icono)}
                    </span>
                  </div>
                )}
              </div>

              {/* Selector grid preset icons */}
              <div className="border border-border/60 rounded-2xl p-3 bg-muted/20">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                  Seleccionar ícono predefinido:
                </p>
                <div className="grid grid-cols-6 gap-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                  {PRESET_ICONS.map((preset) => {
                    const isSelected = form.icono === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, icono: preset.id }))}
                        title={preset.name}
                        className={`h-10 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-primary text-white scale-105 shadow-md shadow-primary/20'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {resolveIcon(preset.id)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-border mt-4">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-foreground">Estado Activo</Label>
                <p className="text-[10px] text-muted-foreground">
                  Los elementos inactivos no se muestran en los formularios.
                </p>
              </div>
              <Switch
                checked={form.activo}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, activo: checked }))}
              />
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={saving}>
                {dialog.mode === 'create' ? 'Crear' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
};
