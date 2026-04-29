'use client';

import { useState } from 'react';

import { Card } from '@/components/ui/legacy-card';
import { Button } from '@/components/ui/legacy-button';
import { notify } from '@/lib/notify';
import { profileService } from '@/services/profile-service';

export default function LandlordProfileSecurityPage() {
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const [guardando, setGuardando] = useState(false);

  const validar = (): string | null => {
    if (!form.actual) return 'Ingresa tu contraseña actual';
    if (!form.nueva) return 'Ingresa la nueva contraseña';
    if (form.nueva.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres';
    if (form.nueva !== form.confirmar) return 'Las contraseñas no coinciden';
    if (form.nueva === form.actual) return 'La nueva contraseña debe ser distinta a la actual';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validar();
    if (err) {
      notify.warning(err);
      return;
    }
    setGuardando(true);
    try {
      await profileService.cambiarPassword(form.actual, form.nueva);
      notify.success('Contraseña actualizada');
      setForm({ actual: '', nueva: '', confirmar: '' });
    } catch (err) {
      notify.error(err, 'No se pudo cambiar la contraseña');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
          Seguridad
        </h1>
        <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
          Cambia tu contraseña periódicamente para proteger tu cuenta.
        </p>
      </header>

      <Card className="bg-white/40 border border-on-surface/5 p-6 max-w-xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <Campo
            label="Contraseña actual"
            value={form.actual}
            onChange={(v) => setForm((p) => ({ ...p, actual: v }))}
          />
          <Campo
            label="Nueva contraseña"
            value={form.nueva}
            onChange={(v) => setForm((p) => ({ ...p, nueva: v }))}
            ayuda="Mínimo 8 caracteres"
          />
          <Campo
            label="Confirmar nueva contraseña"
            value={form.confirmar}
            onChange={(v) => setForm((p) => ({ ...p, confirmar: v }))}
          />

          <div className="flex justify-end">
            <Button type="submit" variant="dark" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Cambiar contraseña'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  ayuda,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  ayuda?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">
        {label}
      </span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-4 py-2 rounded-xl bg-on-surface/5 border border-on-surface/10 text-sm focus:outline-none focus:border-blue-500"
      />
      {ayuda && <p className="text-[10px] text-on-surface-variant mt-1">{ayuda}</p>}
    </label>
  );
}
