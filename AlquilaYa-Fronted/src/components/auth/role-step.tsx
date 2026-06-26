'use client';

import { ArrowRight, Building2, Clock, GraduationCap, RefreshCw, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuthModal, type AuthRole } from '@/stores/auth-modal-store';
import { cn } from '@/lib/cn';

const ROLES: Array<{
  role: AuthRole;
  title: string;
  desc: string;
  tags: string[];
  icon: typeof GraduationCap;
}> = [
  {
    role: 'ESTUDIANTE',
    title: 'Soy estudiante',
    desc: 'Busco cuarto, habitación o depa cerca a mi universidad',
    tags: ['Búsqueda avanzada', 'Favoritos'],
    icon: GraduationCap,
  },
  {
    role: 'ARRENDADOR',
    title: 'Soy arrendador',
    desc: 'Quiero publicar mis cuartos y gestionar reservas fácilmente',
    tags: ['Dashboard', 'Pagos automatizados'],
    icon: Building2,
  },
];

const CHIPS = [
  { icon: Clock, label: '2 min de registro' },
  { icon: ShieldCheck, label: 'Sin spam' },
  { icon: RefreshCw, label: 'Cambia de rol después' },
];

export function RoleStep() {
  const { targetRole, setRole, setStep } = useAuthModal();
  const selected = ROLES.find((r) => r.role === targetRole) ?? ROLES[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Empecemos</p>
        <h2 className="text-3xl font-bold leading-tight tracking-tight text-foreground">
          ¿Cómo vas a usar AlquilaYa?
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Elige tu perfil — podrás ajustarlo después desde tu cuenta
        </p>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {ROLES.map((opt) => {
          const Icon = opt.icon;
          const active = targetRole === opt.role;
          return (
            <button
              key={opt.role}
              type="button"
              onClick={() => setRole(opt.role)}
              className={cn(
                'flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-200',
                active
                  ? 'border-primary bg-white shadow-lg shadow-primary/10 -translate-y-0.5'
                  : 'border-border bg-white shadow-sm hover:border-primary/30',
              )}
            >
              {/* Ícono */}
              <span className={cn(
                'flex size-14 shrink-0 items-center justify-center rounded-xl',
                active ? 'bg-primary/10' : 'bg-muted',
              )}>
                <Icon className={cn('size-7', active ? 'text-primary' : 'text-muted-foreground')} />
              </span>

              {/* Contenido */}
              <span className="flex-1 space-y-1.5 text-left">
                <span className="flex items-center justify-between">
                  <span className="block text-base font-bold text-foreground">{opt.title}</span>
                  {/* Radio */}
                  <span className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                    active ? 'border-primary bg-white' : 'border-muted-foreground/30 bg-white',
                  )}>
                    {active && <span className="size-2.5 rounded-full bg-primary" />}
                  </span>
                </span>

                <span className="block text-xs text-muted-foreground">{opt.desc}</span>

                <span className="flex flex-wrap gap-1.5">
                  {opt.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        active
                          ? 'border-primary/15 bg-primary/5 text-primary'
                          : 'border-border bg-muted/50 text-muted-foreground',
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Chips informativos */}
      <div className="flex flex-wrap justify-center gap-6">
        {CHIPS.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <Icon className="size-3.5" aria-hidden />
            {label}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <Button
          type="button"
          onClick={() => setStep('personal')}
          className="group h-auto w-full gap-2.5 rounded-2xl py-4 text-base font-bold shadow-lg shadow-primary/20"
        >
          {selected.role === 'ESTUDIANTE' ? 'Continuar como estudiante' : 'Continuar como arrendador'}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          ¿Necesitas ayuda?{' '}
          <a href="mailto:soporte@alquilaya.pe" className="font-bold text-primary hover:underline">
            Contactar soporte
          </a>
        </p>
      </div>
    </div>
  );
}
