'use client';

import { ArrowRight, GraduationCap, Home } from 'lucide-react';

import { useAuthModal, type AuthRole } from '@/stores/auth-modal-store';
import { cn } from '@/lib/cn';

const options: Array<{
  role: AuthRole;
  title: string;
  description: string;
  icon: typeof GraduationCap;
}> = [
  {
    role: 'ESTUDIANTE',
    title: 'Estudiante',
    description: 'Busco un cuarto cerca de la UPeU',
    icon: GraduationCap,
  },
  {
    role: 'ARRENDADOR',
    title: 'Arrendador',
    description: 'Quiero alquilar mis cuartos',
    icon: Home,
  },
];

export function RoleStep() {
  const { targetRole, setRole } = useAuthModal();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="font-headline text-2xl font-bold tracking-tight text-foreground">
          ¿Cómo te quieres registrar?
        </h2>
        <p className="text-sm text-muted-foreground">
          Elige tu rol — podrás cambiar luego desde tu perfil.
        </p>
      </header>

      <div className="grid gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = targetRole === opt.role;
          return (
            <button
              key={opt.role}
              type="button"
              onClick={() => setRole(opt.role)}
              className={cn(
                'group flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 text-left transition-all',
                'hover:border-primary/40 hover:bg-primary/5',
                active && 'border-primary bg-primary/5 shadow-lg shadow-primary/10',
              )}
              aria-pressed={active}
            >
              <span
                className={cn(
                  'flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors',
                  active && 'bg-primary text-primary-foreground',
                )}
                aria-hidden
              >
                <Icon className="size-6" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-foreground">{opt.title}</span>
                <span className="block text-xs text-muted-foreground">{opt.description}</span>
              </span>
              <ArrowRight
                className={cn(
                  'size-4 text-muted-foreground transition-all',
                  active && 'translate-x-1 text-primary',
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
