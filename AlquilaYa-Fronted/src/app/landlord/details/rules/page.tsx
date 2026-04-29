'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { propiedadService } from '@/services/landlord-property-service';
import { useAuthStore } from '@/stores/auth-store';
import { notify } from '@/lib/notify';
import { REGLAS_CATALOGO, type PropiedadBackend } from '@/types/propiedad';

export default function RulesPage() {
  const { usuario } = useAuthStore();
  const [propiedades, setPropiedades] = useState<PropiedadBackend[]>([]);
  const [propiedadId, setPropiedadId] = useState<string>('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const clavesCatalogo = useMemo(
    () => new Set(REGLAS_CATALOGO.map((r) => r.clave)),
    [],
  );

  const aplicarReglas = (prop: PropiedadBackend) => {
    const list = prop.reglas ?? [];
    setSeleccion(new Set(list.filter((r) => clavesCatalogo.has(r))));
    setExtra(list.filter((r) => !clavesCatalogo.has(r)).join('\n'));
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
          aplicarReglas(data[0]);
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
    if (prop) aplicarReglas(prop);
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
      await propiedadService.actualizar(propiedadId, { reglas: lista });
      notify.success('Reglas actualizadas');
      setPropiedades((prev) =>
        prev.map((p) =>
          String(p.id) === propiedadId ? { ...p, reglas: lista } : p,
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
        <p className="text-on-surface-variant font-medium">Cargando reglas...</p>
      </div>
    );
  }

  if (!propiedades.length) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center animate-fade-in">
        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
          <span className="material-symbols-outlined text-4xl">gavel</span>
        </div>
        <h1 className="text-2xl font-black text-on-surface mb-2">No tienes propiedades aún</h1>
        <p className="text-on-surface-variant mb-6">
          Publica una propiedad primero para configurar sus reglas.
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
          Reglas
        </Badge>
        <h1 className="text-4xl font-black text-on-surface tracking-tighter">
          Reglas de la <span className="text-primary">casa</span>
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-lg">
          Define las normas de convivencia que esperas de tus inquilinos.
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
        <h2 className="text-lg font-black text-on-surface mb-4">Reglas comunes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REGLAS_CATALOGO.map((r) => {
            const activo = seleccion.has(r.clave);
            return (
              <label
                key={r.clave}
                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  activo
                    ? 'bg-primary/10 border-primary/40'
                    : 'bg-surface border-outline-variant/20 hover:border-primary/30'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined ${activo ? 'text-primary' : 'text-on-surface-variant'}`}
                  >
                    {r.icono}
                  </span>
                  <span
                    className={`text-sm font-medium ${activo ? 'text-primary' : 'text-on-surface'}`}
                  >
                    {r.etiqueta}
                  </span>
                </span>
                <span
                  className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${
                    activo ? 'bg-primary' : 'bg-surface-variant'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={() => toggle(r.clave)}
                    className="sr-only"
                  />
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      activo ? 'translate-x-4' : ''
                    }`}
                  />
                </span>
              </label>
            );
          })}
        </div>
      </Card>

      <Card className="border-none shadow-sm bg-surface-container-low mb-6">
        <h2 className="text-lg font-black text-on-surface mb-2">Reglas personalizadas</h2>
        <p className="text-xs text-on-surface-variant mb-3">
          Una regla por línea. Por ejemplo: "Reciclar en bolsas separadas".
        </p>
        <textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Reciclar en bolsas separadas"
          className="w-full min-h-[120px] rounded-xl bg-surface border-none p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
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
