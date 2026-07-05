'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Lock, Pencil, Plus, Shield, Trash2, UserCog, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import {
  rbacService,
  type Funcionalidad,
  type RolPersonalizado,
  type RolRequest,
} from '@/services/rbac-service';

/**
 * Gestión de roles personalizados (RBAC dinámico, #32): crear roles a medida, marcar sus
 * permisos en una matriz y asignarlos a usuarios. Complementa la matriz de roles base.
 */
export function CustomRolesManager() {
  const [roles, setRoles] = useState<RolPersonalizado[]>([]);
  const [funcs, setFuncs] = useState<Funcionalidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<RolPersonalizado | 'nuevo' | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const [r, f] = await Promise.all([rbacService.listarRoles(), rbacService.listarFuncionalidades()]);
      setRoles(r);
      setFuncs(f);
    } catch (err) {
      notify.error(err, 'No se pudieron cargar los roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const eliminar = async (rol: RolPersonalizado) => {
    if (!confirm(`¿Eliminar el rol "${rol.nombre}"? Se quitará de todos los usuarios que lo tengan.`)) return;
    try {
      await rbacService.eliminarRol(rol.id);
      notify.success('Rol eliminado');
      void cargar();
    } catch (err) {
      notify.error(err, 'No se pudo eliminar el rol.');
    }
  };

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-slate-900">Roles personalizados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Crea roles de staff a medida (moderador, verificador, soporte…) y marca exactamente qué puede hacer cada uno.
            Se suman al rol base del usuario.
          </p>
        </div>
        <Button onClick={() => setEditando('nuevo')} className="gap-1.5 font-bold">
          <Plus className="size-4" /> Nuevo rol
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="size-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((rol) => (
            <div key={rol.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Shield className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{rol.nombre}</p>
                  {rol.sistema && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <Lock className="size-3" /> Sistema
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs text-slate-500">
                {rol.descripcion || 'Sin descripción'}
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-600">
                {rol.funcionalidades.length} permiso{rol.funcionalidades.length === 1 ? '' : 's'}
              </p>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setEditando(rol)}>
                  <Pencil className="size-3.5" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:bg-destructive/5"
                  disabled={rol.sistema}
                  title={rol.sistema ? 'Los roles de sistema no se eliminan' : 'Eliminar'}
                  onClick={() => eliminar(rol)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AsignarPanel roles={roles} />

      {editando && (
        <RolModal
          rol={editando === 'nuevo' ? null : editando}
          funcs={funcs}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            void cargar();
          }}
        />
      )}
    </section>
  );
}

function RolModal({
  rol,
  funcs,
  onClose,
  onSaved,
}: {
  rol: RolPersonalizado | null;
  funcs: Funcionalidad[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set(rol?.funcionalidades ?? []));
  const [guardando, setGuardando] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const porCategoria = useMemo(() => {
    const map = new Map<string, Funcionalidad[]>();
    for (const f of funcs) {
      const cat = f.categoria || 'Otros';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(f);
    }
    return Array.from(map.entries());
  }, [funcs]);

  const toggle = (clave: string) =>
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });

  const guardar = async () => {
    if (!nombre.trim()) {
      notify.error(null, 'El nombre del rol es obligatorio.');
      return;
    }
    setGuardando(true);
    const req: RolRequest = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      funcionalidades: Array.from(seleccion),
    };
    try {
      if (rol) await rbacService.actualizarRol(rol.id, req);
      else await rbacService.crearRol(req);
      notify.success(rol ? 'Rol actualizado' : 'Rol creado');
      onSaved();
    } catch (err) {
      notify.error(err, 'No se pudo guardar el rol.');
      setGuardando(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative my-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-black text-slate-900">{rol ? `Editar "${rol.nombre}"` : 'Nuevo rol'}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Nombre {rol?.sistema && '(rol de sistema)'}
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={rol?.sistema}
                placeholder="Ej. Moderador"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Descripción</label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Qué hace este rol"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-600">Permisos ({seleccion.size} seleccionados)</p>
            <div className="space-y-4">
              {porCategoria.map(([cat, items]) => (
                <div key={cat}>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{cat}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {items.map((f) => {
                      const on = seleccion.has(f.clave);
                      return (
                        <button
                          key={f.clave}
                          type="button"
                          onClick={() => toggle(f.clave)}
                          className={cn(
                            'flex items-start gap-2 rounded-lg border p-2.5 text-left transition',
                            on ? 'border-primary/40 bg-primary/5' : 'border-slate-200 hover:border-slate-300',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                              on ? 'border-primary bg-primary text-white' : 'border-slate-300',
                            )}
                          >
                            {on && <Check className="size-3" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-800">{f.nombre}</span>
                            {f.descripcion && <span className="block text-[11px] text-slate-400">{f.descripcion}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando} className="gap-1.5 font-bold">
            {guardando && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AsignarPanel({ roles }: { roles: RolPersonalizado[] }) {
  const [usuarioId, setUsuarioId] = useState('');
  const [asignados, setAsignados] = useState<Set<number> | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    const id = usuarioId.trim();
    if (!id) return;
    setCargando(true);
    try {
      const r = await rbacService.rolesDeUsuario(id);
      setAsignados(new Set(r.map((x) => x.id)));
    } catch (err) {
      notify.error(err, 'No se pudo cargar el usuario.');
      setAsignados(null);
    } finally {
      setCargando(false);
    }
  };

  const toggle = async (rol: RolPersonalizado) => {
    if (!asignados) return;
    const tiene = asignados.has(rol.id);
    try {
      if (tiene) await rbacService.quitarRol(usuarioId.trim(), rol.id);
      else await rbacService.asignarRol(usuarioId.trim(), rol.id);
      setAsignados((prev) => {
        const next = new Set(prev);
        if (tiene) next.delete(rol.id);
        else next.add(rol.id);
        return next;
      });
    } catch (err) {
      notify.error(err, 'No se pudo actualizar la asignación.');
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <UserCog className="size-5 text-primary" />
        <h3 className="text-lg font-black text-slate-900">Asignar roles a un usuario</h3>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">ID de usuario</label>
          <input
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && cargar()}
            placeholder="Ej. 42"
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <Button onClick={cargar} disabled={cargando} variant="outline" className="gap-1.5">
          {cargando && <Loader2 className="size-4 animate-spin" />} Cargar
        </Button>
      </div>

      {asignados && (
        <div className="mt-4 flex flex-wrap gap-2">
          {roles.length === 0 && <p className="text-sm text-slate-400">No hay roles definidos todavía.</p>}
          {roles.map((rol) => {
            const on = asignados.has(rol.id);
            return (
              <button
                key={rol.id}
                onClick={() => toggle(rol)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition',
                  on ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-600 hover:border-slate-400',
                )}
              >
                {on ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                {rol.nombre}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
