'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { propiedadService } from '@/services/landlord-property-service';
import { useAuthStore } from '@/stores/auth-store';
import { notify } from '@/lib/notify';
import { SERVICIOS_CATALOGO, type PropiedadBackend } from '@/types/propiedad';

export default function ServicesPage() {
  const { usuario } = useAuthStore();
  const [propiedades, setPropiedades] = useState<PropiedadBackend[]>([]);
  const [propiedadId, setPropiedadId] = useState<string>('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const clavesCatalogo = useMemo(
    () => new Set(SERVICIOS_CATALOGO.map((s) => s.clave)),
    [],
  );

  const aplicarServicios = (prop: PropiedadBackend) => {
    const list = prop.serviciosIncluidos ?? [];
    setSeleccion(new Set(list.filter((s) => clavesCatalogo.has(s))));
    setExtra(list.filter((s) => !clavesCatalogo.has(s)).join('\n'));
  };

  useEffect(() => {
    const cargar = async () => {
      if (!usuario?.perfilId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await propiedadService.obtenerPorArrendador(String(usuario.perfilId));
        setPropiedades(data);
        if (data.length > 0) {
          setPropiedadId(String(data[0].id));
          aplicarServicios(data[0]);
        }
      } catch (err) {
        notify.error(err, 'No se pudieron cargar tus propiedades');
      } finally {
        setLoading(false);
      }
    };
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.perfilId]);

  const handleSelect = (id: string) => {
    setPropiedadId(id);
    const prop = propiedades.find((p) => String(p.id) === id);
    if (prop) aplicarServicios(prop);
  };

  const toggle = (clave: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  };

  const handleSave = async () => {
    if (!propiedadId) return;
    try {
      setSaving(true);
      const extras = extra
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const lista = Array.from(seleccion).concat(extras);
      await propiedadService.actualizar(propiedadId, { serviciosIncluidos: lista });
      notify.success('Servicios actualizados');
      setPropiedades((prev) =>
        prev.map((p) =>
          String(p.id) === propiedadId ? { ...p, serviciosIncluidos: lista } : p,
        ),
      );
    } catch (err) {
      notify.error(err, 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-medium">Cargando servicios...</p>
      </div>
    );
  }

  if (!propiedades.length) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center animate-fade-in">
        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
          <span className="material-symbols-outlined text-4xl">checklist</span>
        </div>
        <h1 className="text-2xl font-black text-on-surface mb-2">No tienes propiedades aún</h1>
        <p className="text-on-surface-variant mb-6">
          Publica una propiedad primero para configurar sus servicios.
        </p>
        <Button asChild variant="dark">
          <Link href="/landlord/properties/add">Publicar propiedad</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
      <div className="mb-8">
        <Badge variant="surface" className="mb-2">
          Servicios
        </Badge>
        <h1 className="text-4xl font-black text-on-surface tracking-tighter">
          Servicios <span className="text-primary">incluidos</span>
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-lg">
          Marca lo que incluye tu propiedad para atraer al estudiante adecuado.
        </p>
      </div>

      <Card className="border-none shadow-sm bg-surface-container-low mb-6">
        <label className="text-sm font-medium text-on-surface-variant block mb-2">
          Propiedad
        </label>
        <select
          value={propiedadId}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full rounded-2xl bg-surface border border-outline-variant/20 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {propiedades.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.titulo}
            </option>
          ))}
        </select>
      </Card>

      <Card className="border-none shadow-sm bg-surface-container-low mb-6">
        <h2 className="text-lg font-black text-on-surface mb-4">Catálogo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {SERVICIOS_CATALOGO.map((s) => {
            const activo = seleccion.has(s.clave);
            return (
              <label
                key={s.clave}
                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  activo
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-surface border-outline-variant/20 text-on-surface hover:border-primary/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={() => toggle(s.clave)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="material-symbols-outlined">{s.icono}</span>
                <span className="text-sm font-medium">{s.etiqueta}</span>
              </label>
            );
          })}
        </div>
      </Card>

      <Card className="border-none shadow-sm bg-surface-container-low mb-6">
        <h2 className="text-lg font-black text-on-surface mb-2">Servicios adicionales</h2>
        <p className="text-xs text-on-surface-variant mb-3">
          Uno por línea (por ejemplo: limpieza semanal, balcón privado).
        </p>
        <textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Limpieza semanal"
          className="w-full min-h-[100px] rounded-xl bg-surface border-none p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
        />
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="dark"
          onClick={handleSave}
          disabled={saving}
          className="h-12 px-8 rounded-2xl"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}
