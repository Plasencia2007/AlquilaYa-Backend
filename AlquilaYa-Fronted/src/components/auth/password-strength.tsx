'use client';

import { Check } from 'lucide-react';

interface PasswordStrengthProps {
  password?: string;
}

export function PasswordStrength({ password = '' }: PasswordStrengthProps) {
  const requirements = [
    { short: '8+ caracteres', met: password.length >= 8 },
    { short: 'mayúscula', met: /[A-Z]/.test(password) },
    { short: 'minúscula', met: /[a-z]/.test(password) },
    { short: 'número', met: /[0-9]/.test(password) },
    { short: 'símbolo', met: /[@$!%*?&]/.test(password) },
  ];

  if (!password) return null;

  const metCount = requirements.filter((r) => r.met).length;
  const allMet = metCount === requirements.length;
  const missing = requirements.filter((r) => !r.met).map((r) => r.short);

  const strengthColor =
    metCount <= 2 ? 'bg-destructive' : metCount <= 4 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="mt-2 space-y-1.5 animate-in fade-in-50 duration-200">
      <div className="flex gap-1">
        {requirements.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < metCount ? strengthColor : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="px-1 text-[11px] leading-tight">
        {allMet ? (
          <span className="inline-flex items-center gap-1 font-medium text-green-600">
            <Check className="size-3 stroke-[3]" /> Contraseña segura
          </span>
        ) : (
          <span className="text-muted-foreground">
            Falta: <span className="font-medium text-foreground/80">{missing.join(' · ')}</span>
          </span>
        )}
      </p>
    </div>
  );
}
