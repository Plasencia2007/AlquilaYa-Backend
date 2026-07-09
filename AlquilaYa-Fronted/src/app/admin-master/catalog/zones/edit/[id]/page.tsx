'use client';

import { useEffect, useState, type InputHTMLAttributes } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import {
  universidadService,
  type TipoLimite,
  type UniversidadInput,
  type ZonaCoberturaInput,
} from '@/services/universidad-service';
import { Button } from '@/components/ui/legacy-button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/cn';

/** Input minimalista local (h-10, rounded-md) — alineado con el resto del panel. */
function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors',
        className,
      )}
    />
  );
}

// Leaflet no soporta SSR (usa `window`) → import dinámico, igual que en landlord/profile.
const ZonaCoberturaMap = dynamic(() => import('@/components/admin/ZonaCoberturaMap'), { ssr: false });

const BASE = '/admin-master/catalog/zones/edit';
const CENTRO_DEFECTO = { lat: -12.0464, lng: -77.0428 }; // Lima centro, solo punto de partida del mapa

interface Punto { lat: number; lng: number; }

function parsePoligono(json?: string | null): Punto[] {
  if (!json || !json.trim()) return [];
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return (data as Array<{ lat?: unknown; lng?: unknown }>)
      .filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => ({ lat: p.lat as number, lng: p.lng as number }));
  } catch {
    return [];
  }
}

function nuevaZona(center: Punto, orden: number): ZonaCoberturaInput {
  return {
    nombre: orden === 0 ? 'Zona principal' : `Zona ${orden + 1}`,
    tipoLimite: 'CIRCULO',
    activo: true,
    ordenPrioridad: orden,
    color: '#8f0304',
    latitud: center.lat,
    longitud: center.lng,
    radioKm: 5,
    poligonoJson: '',
  };
}

export default function UniversidadFormPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const isNew = id === 'nueva';

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('#8f0304');
  const [activo, setActivo] = useState(true);
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [zonas, setZonas] = useState<ZonaCoberturaInput[]>([nuevaZona(CENTRO_DEFECTO, 0)]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    if (isNew) return;
    (async () => {
      try {
        const u = await universidadService.obtener(Number(id));
        setNombre(u.nombre);
        setDescripcion(u.descripcion ?? '');
        setColor(u.color ?? '#8f0304');
        setActivo(u.activo);
        setEsPrincipal(u.esPrincipal ?? false);
        const cargadas: ZonaCoberturaInput[] = (u.zonas ?? []).map((z) => ({
          nombre: z.nombre,
          descripcion: z.descripcion ?? undefined,
          color: z.color ?? '#8f0304',
          activo: z.activo,
          ordenPrioridad: z.ordenPrioridad,
          tipoLimite: z.tipoLimite,
          latitud: z.latitud ?? undefined,
          longitud: z.longitud ?? undefined,
          radioKm: z.radioKm ?? undefined,
          poligonoJson: z.poligonoJson ?? '',
          comisionPorcentaje: z.comisionPorcentaje ?? undefined,
          comisionMonto: z.comisionMonto ?? undefined,
        }));
        setZonas(cargadas.length > 0 ? cargadas : [nuevaZona(CENTRO_DEFECTO, 0)]);
        setActiveIdx(0);
      } catch {
        setError('No se pudo cargar la universidad.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const activeZona = zonas[activeIdx];
  const mapCenter: Punto =
    activeZona && activeZona.latitud != null && activeZona.longitud != null
      ? { lat: activeZona.latitud, lng: activeZona.longitud }
      : CENTRO_DEFECTO;

  const patchZona = (patch: Partial<ZonaCoberturaInput>) =>
    setZonas((prev) => prev.map((z, i) => (i === activeIdx ? { ...z, ...patch } : z)));

  const addZona = () => {
    setZonas((prev) => [...prev, nuevaZona(mapCenter, prev.length)]);
    setActiveIdx(zonas.length);
  };

  const removeZona = (idx: number) => {
    setZonas((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx((cur) => (cur >= idx && cur > 0 ? cur - 1 : cur));
  };

  const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));
  const redondear = (n: number) => Number(n.toFixed(6));

  // --- Edición de polígono por clic en el mapa ---
  const appendVertice = (lat: number, lng: number) => {
    const pts = parsePoligono(activeZona?.poligonoJson);
    pts.push({ lat: redondear(lat), lng: redondear(lng) });
    patchZona({ poligonoJson: JSON.stringify(pts, null, 2) });
  };
  const deshacerVertice = () => {
    const pts = parsePoligono(activeZona?.poligonoJson);
    pts.pop();
    patchZona({ poligonoJson: pts.length ? JSON.stringify(pts, null, 2) : '' });
  };
  const limpiarPoligono = () => patchZona({ poligonoJson: '' });

  const handleSubmit = async () => {
    setError(null);
    if (nombre.trim().length < 2) {
      setError('El nombre de la universidad debe tener al menos 2 caracteres.');
      return;
    }
    for (const z of zonas) {
      const tipo = z.tipoLimite ?? 'CIRCULO';
      if (!z.nombre || z.nombre.trim().length < 2) {
        setError('Cada zona necesita un nombre de al menos 2 caracteres.');
        return;
      }
      if (tipo === 'CIRCULO') {
        if (z.latitud == null || z.longitud == null || !z.radioKm || z.radioKm <= 0) {
          setError(`La zona "${z.nombre}" (círculo) requiere latitud, longitud y radio mayor a 0.`);
          return;
        }
      } else if (parsePoligono(z.poligonoJson).length < 3) {
        setError(`La zona "${z.nombre}" (polígono) requiere un JSON con al menos 3 coordenadas válidas.`);
        return;
      }
    }

    const primera = zonas[0];
    const input: UniversidadInput = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      color: color || undefined,
      latitud: primera?.latitud,
      longitud: primera?.longitud,
      activo,
      esPrincipal,
      zonas,
    };

    try {
      setSaving(true);
      if (isNew) await universidadService.crear(input);
      else await universidadService.actualizar(Number(id), input);
      router.push(BASE);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || 'No se pudo guardar la universidad.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {isNew ? 'Nueva universidad' : 'Editar universidad'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Configura los datos y las áreas de cobertura (radio o polígono) cerca del campus.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-5">
          {/* Información general */}
          <div className="bg-white border border-slate-200 rounded-md p-6 sm:p-8">
            <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100">
              <span className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">tune</span>
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Información General</h2>
                <p className="text-slate-400 text-xs">Datos básicos de identificación.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="u-nombre">Nombre de la Universidad *</Label>
                <Input
                  id="u-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Universidad Peruana Unión"
                  maxLength={150}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-color">Color (Opcional)</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="u-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-12 rounded-md border border-slate-200 cursor-pointer"
                  />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} maxLength={30} />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="u-desc">Descripción (Opcional)</Label>
                <Input
                  id="u-desc"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Campus Lima — Ñaña"
                  maxLength={500}
                />
              </div>
            </div>
          </div>

          {/* Zonas de cobertura */}
          <div className="bg-white border border-slate-200 rounded-md p-6 sm:p-8">
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-md bg-emerald-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-500 text-xl">map</span>
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Área Geográfica</h2>
                  <p className="text-slate-400 text-xs">Define el perímetro de cada zona de cobertura.</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={addZona} className="text-primary">
                <span className="material-symbols-outlined text-base mr-1">add</span>
                Agregar zona
              </Button>
            </div>

            {/* Selector de zonas */}
            <div className="flex flex-wrap gap-2 mb-6">
              {zonas.map((z, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${
                    i === activeIdx
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary'
                  }`}
                >
                  {z.nombre || `Zona ${i + 1}`}
                </button>
              ))}
            </div>

            {activeZona ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Nombre de la Zona *</Label>
                    <Input
                      value={activeZona.nombre}
                      onChange={(e) => patchZona({ nombre: e.target.value })}
                      maxLength={150}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Orden de Prioridad</Label>
                    <Input
                      type="number"
                      value={activeZona.ordenPrioridad ?? 0}
                      onChange={(e) => patchZona({ ordenPrioridad: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color de la Zona</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={activeZona.color ?? '#8f0304'}
                        onChange={(e) => patchZona({ color: e.target.value })}
                        className="h-10 w-12 rounded-md border border-slate-200 cursor-pointer shrink-0"
                      />
                      <Input
                        value={activeZona.color ?? ''}
                        onChange={(e) => patchZona({ color: e.target.value })}
                        maxLength={30}
                        placeholder="#8f0304"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Límite</Label>
                    <select
                      value={activeZona.tipoLimite ?? 'CIRCULO'}
                      onChange={(e) => patchZona({ tipoLimite: e.target.value as TipoLimite })}
                      className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:border-primary outline-none"
                    >
                      <option value="CIRCULO">Área Circular (Por Radio)</option>
                      <option value="POLIGONO">Polígono (Dibujar en el mapa)</option>
                    </select>
                  </div>
                </div>

                {(activeZona.tipoLimite ?? 'CIRCULO') === 'CIRCULO' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 rounded-md p-5">
                    <div className="space-y-2">
                      <Label>Latitud Central</Label>
                      <Input
                        type="number"
                        value={activeZona.latitud ?? ''}
                        onChange={(e) => patchZona({ latitud: numOrUndef(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitud Central</Label>
                      <Input
                        type="number"
                        value={activeZona.longitud ?? ''}
                        onChange={(e) => patchZona({ longitud: numOrUndef(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Radio (Km)</Label>
                      <Input
                        type="number"
                        value={activeZona.radioKm ?? ''}
                        onChange={(e) => patchZona({ radioKm: numOrUndef(e.target.value) })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>
                        Vértices del polígono
                        <span className="ml-2 text-slate-400 font-normal">
                          {parsePoligono(activeZona.poligonoJson).length} punto(s)
                        </span>
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={deshacerVertice}
                          disabled={parsePoligono(activeZona.poligonoJson).length === 0}
                          className="text-slate-600"
                        >
                          <span className="material-symbols-outlined text-base mr-1">undo</span>
                          Deshacer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={limpiarPoligono}
                          disabled={parsePoligono(activeZona.poligonoJson).length === 0}
                          className="text-red-500 hover:text-red-600"
                        >
                          <span className="material-symbols-outlined text-base mr-1">delete_sweep</span>
                          Limpiar
                        </Button>
                      </div>
                    </div>
                    <textarea
                      value={activeZona.poligonoJson ?? ''}
                      onChange={(e) => patchZona({ poligonoJson: e.target.value })}
                      rows={5}
                      placeholder={'Haz clic en el mapa para agregar vértices, o pega un array JSON:\n[\n  { "lat": -12.046, "lng": -77.042 },\n  { "lat": -12.051, "lng": -77.038 }\n]'}
                      className="w-full rounded-md border border-slate-200 p-3 text-xs font-mono bg-white focus:border-primary outline-none"
                    />
                    <p className="text-[11px] text-amber-600">
                      Dibuja en el mapa o pega un array JSON de {`{ "lat", "lng" }`}. Se necesitan al menos 3 puntos válidos.
                    </p>
                  </div>
                )}

                {/* Mapa con buscador */}
                {isMounted ? (
                  <ZonaCoberturaMap
                    center={mapCenter}
                    onPositionChange={(lat, lng) => patchZona({ latitud: lat, longitud: lng })}
                    onAppendVertex={appendVertice}
                    tipoLimite={activeZona.tipoLimite ?? 'CIRCULO'}
                    radioKm={activeZona.radioKm ?? undefined}
                    poligonoPuntos={parsePoligono(activeZona.poligonoJson)}
                    color={activeZona.color ?? color}
                  />
                ) : (
                  <div className="w-full h-[360px] rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Inicializando mapa...</span>
                  </div>
                )}

                {zonas.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeZona(activeIdx)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <span className="material-symbols-outlined text-base mr-1">delete</span>
                    Quitar esta zona
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No hay zonas. Agrega una para definir la cobertura.</p>
            )}
          </div>

          {/* Tarifas de la zona (comisión al arrendador) */}
          {activeZona && (
            <div className="bg-white border border-slate-200 rounded-md p-6 sm:p-8">
              <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100">
                <span className="w-10 h-10 rounded-md bg-emerald-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600 text-xl">payments</span>
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Tarifas de la zona</h2>
                  <p className="text-slate-400 text-xs">
                    Comisión que se cobra al arrendador por cada cuarto vendido en esta zona.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Comisión por venta (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={activeZona.comisionPorcentaje ?? ''}
                    onChange={(e) => patchZona({ comisionPorcentaje: numOrUndef(e.target.value) })}
                    placeholder="Ej. 8.5"
                  />
                  <p className="text-[11px] text-slate-400">Porcentaje del precio del cuarto. Vacío = sin comisión %.</p>
                </div>
                <div className="space-y-2">
                  <Label>Comisión fija (S/)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={activeZona.comisionMonto ?? ''}
                    onChange={(e) => patchZona({ comisionMonto: numOrUndef(e.target.value) })}
                    placeholder="Ej. 5.00"
                  />
                  <p className="text-[11px] text-slate-400">Monto fijo por venta. Vacío = sin comisión fija.</p>
                </div>
              </div>

              <p className="text-[11px] text-amber-600 mt-4">
                Si dejas ambos vacíos, no se cobra comisión en esta zona. El cobro automático en cada venta se
                aplicará más adelante.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar de acciones */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-md p-6">
            <h3 className="text-base font-bold text-slate-900 pb-4 mb-4 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">save</span>
              Resumen y Acciones
            </h3>
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Estado Operativo</p>
                <p className="text-xs text-slate-500">Si está inactiva, no se ofrecerá al cliente.</p>
              </div>
              <Switch checked={activo} onCheckedChange={setActivo} />
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-3 mb-5">
              <div>
                <p className="text-sm font-semibold text-slate-800">Campus principal</p>
                <p className="text-xs text-slate-500">Ancla de cercanía del sistema. Solo una puede serlo.</p>
              </div>
              <Switch checked={esPrincipal} onCheckedChange={setEsPrincipal} />
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full h-11 rounded-md bg-primary text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 mb-3"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              {saving ? 'Guardando…' : 'Guardar Universidad'}
            </button>
            <button
              type="button"
              onClick={() => router.push(BASE)}
              disabled={saving}
              className="w-full h-11 rounded-md border border-slate-200 text-slate-600 text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Volver
            </button>
          </div>

          <div className="bg-primary/50 border border-primary/20 rounded-md p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">info</span>
              Conflictos
            </h3>
            <p className="text-xs text-slate-600">
              Si una ubicación cae en 2 o más zonas, prevalece la de <b>Orden de Prioridad</b> más cercano a 0.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
