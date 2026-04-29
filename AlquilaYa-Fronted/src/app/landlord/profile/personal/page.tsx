'use client';

import { useEffect, useState } from 'react';

import { Card } from '@/components/ui/legacy-card';
import { Button } from '@/components/ui/legacy-button';
import { notify } from '@/lib/notify';
import { profileService } from '@/services/profile-service';
import type { Perfil } from '@/types/profile';

export default function LandlordProfilePersonalPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
    fotoUrl: '',
  });
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    profileService
      .obtenerMiPerfil()
      .then((p) => {
        if (cancelado) return;
        setPerfil(p);
        setForm({
          nombre: p.nombre ?? '',
          apellido: p.apellido ?? '',
          telefono: p.telefono ?? '',
          direccion: p.direccion ?? '',
          fotoUrl: p.fotoUrl ?? '',
        });
      })
      .catch((err) => notify.error(err, 'No se pudo cargar tu perfil'))
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const onFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewFoto(result);
      // En una versión completa aquí se subiría a /storage y se obtendría la URL.
      setForm((prev) => ({ ...prev, fotoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const actualizado = await profileService.actualizarPerfil(form);
      setPerfil(actualizado);
      notify.success('Perfil actualizado');
    } catch (err) {
      notify.error(err, 'No se pudo actualizar el perfil');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <Card className="bg-white/40 border border-on-surface/5 p-6 text-sm text-on-surface-variant">
        Cargando perfil…
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
          Datos personales
        </h1>
        <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
          Mantén tu información actualizada para los estudiantes.
        </p>
      </header>

      <Card className="bg-white/40 border border-on-surface/5 p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-on-surface/10 flex items-center justify-center overflow-hidden text-2xl font-black text-on-surface/60">
              {previewFoto || form.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFoto || form.fotoUrl}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                (perfil?.nombre ?? '?').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full bg-on-surface/10 hover:bg-on-surface/20 text-sm font-bold transition-colors">
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Cambiar foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFotoChange}
                />
              </label>
              <p className="text-[11px] text-on-surface-variant mt-2">PNG o JPG, máx. 5 MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nombre"
              value={form.nombre}
              onChange={(v) => setForm((p) => ({ ...p, nombre: v }))}
              required
            />
            <Field
              label="Apellido"
              value={form.apellido}
              onChange={(v) => setForm((p) => ({ ...p, apellido: v }))}
              required
            />
            <Field
              label="Teléfono"
              value={form.telefono}
              onChange={(v) => setForm((p) => ({ ...p, telefono: v }))}
              placeholder="+51 9XX XXX XXX"
            />
            <Field
              label="Correo"
              value={perfil?.correo ?? ''}
              onChange={() => {}}
              disabled
            />
            <div className="md:col-span-2">
              <Field
                label="Dirección"
                value={form.direccion}
                onChange={(v) => setForm((p) => ({ ...p, direccion: v }))}
                placeholder="Calle, número, distrito"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="dark" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="mt-1 w-full px-4 py-2 rounded-xl bg-on-surface/5 border border-on-surface/10 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
      />
    </label>
  );
}
