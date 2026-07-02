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
import { notify } from '@/lib/notify';

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

const FA_TO_MATERIAL: Record<string, string> = {
  'fa-calendar-alt':  'calendar_month',
  'fa-calendar-check':'event_available',
  'fa-calendar':      'calendar_today',
  'fa-calendar-day':   'today',
  'fa-repeat':         'event_repeat',
  'fa-clock':          'schedule',
  // Servicios comunes
  'fa-wifi':             'wifi',
  'fa-tint':             'water_drop',
  'fa-bolt':             'bolt',
  'fa-lightbulb':        'lightbulb',
  'fa-tshirt':           'checkroom',
  'fa-shirt':            'checkroom',
  'fa-utensils':         'restaurant',
  'fa-key':              'key',
  'fa-shower':           'shower',
  'fa-bath':             'bathtub',
  'fa-tv':               'tv',
  'fa-snowflake':        'ac_unit',
  'fa-temperature-high': 'thermostat',
  'fa-parking':          'local_parking',
  'fa-bus':              'directions_bus',
  'fa-lock':             'lock',
  'fa-couch':            'weekend',
  'fa-bed':              'bed',
  'fa-dumbbell':         'fitness_center',
  'fa-water':            'water',
  'fa-gas-pump':         'local_gas_station',
  'fa-fire':             'local_fire_department',
  'fa-broom':            'cleaning_services',
  'fa-shield-alt':       'security',
  'fa-dog':              'pets',
  // Reglas comunes
  'fa-paw':             'pets',
  'fa-smoking-ban':     'smoke_free',
  'fa-smoking':         'smoking_rooms',
  'fa-graduation-cap':  'school',
  'fa-music':           'music_note',
  'fa-glass-martini':   'local_bar',
  'fa-cocktail':        'local_bar',
  'fa-beer':            'sports_bar',
  'fa-volume-up':       'volume_up',
  'fa-user-friends':    'group',
  'fa-users':           'group',
  'fa-child':           'child_care',
  'fa-ban':             'block',
  'fa-check':           'check_circle',
  'fa-times':           'cancel',
  // Tipos de propiedad
  'fa-home':       'home',
  'fa-building':   'apartment',
  'fa-hotel':      'hotel',
  'fa-door-open':  'door_front',
  'fa-house':      'house',
  // Otros motivos
  'fa-plane-slash': 'flight_land',
  'fa-heartbeat':   'favorite',
  'fa-calendar-times': 'event_busy',
  'fa-exclamation-circle': 'warning',
  'fa-user-times':  'person_remove',
  'fa-wrench':      'build',
  'fa-comments-slash': 'speaker_notes_off',
};

function resolveIcon(icon: string | undefined): string {
  if (!icon) return 'label';
  const key = icon.toLowerCase().trim();
  if (key.startsWith('fa-')) return FA_TO_MATERIAL[key] ?? 'label';
  return icon;
}

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
  activo: true,
});

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
    setDialog({ mode: 'create' });
  };

  const openEdit = (item: ItemCatalogo) => {
    setForm({
      nombre: item.nombre,
      valor: item.valor,
      tipo: item.tipo,
      icono: item.icono || '',
      descripcion: item.descripcion || '',
      activo: item.activo,
    });
    setError(null);
    setDialog({ mode: 'edit', item });
  };

  const closeDialog = () => {
    setDialog({ mode: 'closed' });
    setForm(emptyForm(selectedType));
    setError(null);
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
        valor: form.valor.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_'),
        tipo: form.tipo,
        icono: form.icono?.trim() || undefined,
        descripcion: form.descripcion?.trim() || undefined,
        activo: form.activo,
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
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo guardar el elemento';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este elemento del catálogo?')) return;
    try {
      setDeletingId(id);
      await catalogService.eliminarFiltro(id);
      notify.success('Elemento eliminado correctamente');
      await load();
    } catch (err: any) {
      notify.error(err, 'No se pudo eliminar el elemento');
    } finally {
      setDeletingId(null);
    }
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
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        className="h-7 w-7 text-red-500 hover:bg-red-500/10"
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
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl px-4 py-2.5 text-xs font-semibold">
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
                required
              />
              {form.tipo !== 'BANNER' && (
                <p className="text-[9px] text-muted-foreground/60">
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
    </div>
  );
};
