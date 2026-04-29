'use client';

import React, { useEffect, useState } from 'react';
import { carreraService, type Carrera, type CarreraInput } from '@/services/carrera-service';
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

type DialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; carrera: Carrera };

const emptyForm: CarreraInput = { nombre: '', codigo: '', activo: true };

export const CarrerasTable: React.FC = () => {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });
  const [form, setForm] = useState<CarreraInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await carreraService.listarTodas();
      setCarreras(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando carreras:', err);
      setCarreras([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    setDialog({ mode: 'create' });
  };

  const openEdit = (carrera: Carrera) => {
    setForm({
      nombre: carrera.nombre,
      codigo: carrera.codigo ?? '',
      activo: carrera.activo,
    });
    setError(null);
    setDialog({ mode: 'edit', carrera });
  };

  const closeDialog = () => {
    setDialog({ mode: 'closed' });
    setForm(emptyForm);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || form.nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    try {
      setSaving(true);
      const payload: CarreraInput = {
        nombre: form.nombre.trim(),
        codigo: form.codigo?.trim() || undefined,
        activo: form.activo ?? true,
      };
      if (dialog.mode === 'create') {
        await carreraService.crear(payload);
      } else if (dialog.mode === 'edit') {
        await carreraService.actualizar(dialog.carrera.id, payload);
      }
      await load();
      closeDialog();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo guardar la carrera';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (carrera: Carrera) => {
    try {
      await carreraService.actualizar(carrera.id, {
        nombre: carrera.nombre,
        codigo: carrera.codigo ?? undefined,
        activo: !carrera.activo,
      });
      await load();
    } catch (err) {
      alert('No se pudo cambiar el estado de la carrera');
    }
  };

  const handleDelete = async (carrera: Carrera) => {
    if (!window.confirm(`¿Eliminar permanentemente "${carrera.nombre}"?`)) return;
    try {
      await carreraService.eliminar(carrera.id);
      await load();
    } catch (err) {
      alert('No se pudo eliminar la carrera. Asegúrate de que no esté en uso.');
    }
  };

  const filtered = carreras.filter((c) =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.codigo ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card padding="none" className="border border-slate-200 bg-white shadow-none rounded-xl overflow-hidden mb-6">
        <div className="px-8 py-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Carreras Profesionales</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1">
                Catálogo UPeU • {carreras.length} Registros
              </p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xl">search</span>
                <Input
                  placeholder="Buscar carrera..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border-slate-200 border rounded-lg pl-12 h-10 text-xs focus:ring-0 focus:border-primary transition-colors font-medium"
                />
              </div>
              <Button onClick={openCreate} className="h-10 whitespace-nowrap">
                <span className="material-symbols-outlined text-base mr-1">add</span>
                Nueva carrera
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 uppercase text-[9px] font-black tracking-widest bg-slate-50/50">
                <th className="py-4 px-8 border-b border-slate-100">Nombre</th>
                <th className="py-4 px-8 border-b border-slate-100">Código</th>
                <th className="py-4 px-8 border-b border-slate-100">Estado</th>
                <th className="py-4 px-8 border-b border-slate-100 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Cargando carreras...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin resultados</span>
                  </td>
                </tr>
              ) : filtered.map((carrera) => (
                <tr key={carrera.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="py-4 px-8">
                    <span className="font-bold text-slate-800 text-sm">{carrera.nombre}</span>
                  </td>
                  <td className="py-4 px-8">
                    <span className="text-[10px] font-bold text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">
                      {carrera.codigo || '---'}
                    </span>
                  </td>
                  <td className="py-4 px-8">
                    {carrera.activo
                      ? <Badge variant="success">Activa</Badge>
                      : <Badge variant="outline">Inactiva</Badge>}
                  </td>
                  <td className="py-4 px-8 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActivo(carrera)}
                        className="text-slate-300 hover:text-blue-600 p-2 h-auto rounded-md"
                        title={carrera.activo ? 'Desactivar' : 'Activar'}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {carrera.activo ? 'toggle_on' : 'toggle_off'}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(carrera)}
                        className="text-slate-300 hover:text-primary p-2 h-auto rounded-md"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(carrera)}
                        className="text-slate-300 hover:text-red-600 p-2 h-auto rounded-md"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialog.mode !== 'closed'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'create' ? 'Nueva carrera' : 'Editar carrera'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carrera-nombre">Nombre</Label>
              <Input
                id="carrera-nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ingeniería de Sistemas"
                required
                maxLength={150}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrera-codigo">Código (opcional)</Label>
              <Input
                id="carrera-codigo"
                value={form.codigo ?? ''}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="ISI"
                maxLength={20}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <Label htmlFor="carrera-activo" className="text-sm">Activa</Label>
                <p className="text-xs text-slate-500">
                  Solo las carreras activas aparecen en el registro de estudiantes.
                </p>
              </div>
              <Switch
                id="carrera-activo"
                checked={form.activo ?? true}
                onCheckedChange={(checked) => setForm({ ...form, activo: checked })}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : dialog.mode === 'create' ? 'Crear' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
