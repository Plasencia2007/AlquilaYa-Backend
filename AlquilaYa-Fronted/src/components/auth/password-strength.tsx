'use client';

import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password?: string;
}

export function PasswordStrength({ password = '' }: PasswordStrengthProps) {
  const requirements = [
    {
      label: 'Al menos 8 caracteres',
      met: password.length >= 8,
    },
    {
      label: 'Al menos una letra mayúscula',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'Al menos una letra minúscula',
      met: /[a-z]/.test(password),
    },
    {
      label: 'Al menos un número',
      met: /[0-9]/.test(password),
    },
    {
      label: 'Al menos un carácter especial (@$!%*?&)',
      met: /[@$!%*?&]/.test(password),
    },
  ];

  // No mostrar nada si la contraseña está vacía
  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5 rounded-xl bg-muted/40 p-3.5 text-xs border border-border/50 animate-in fade-in-50 duration-200">
      <p className="font-bold text-foreground/80 mb-2">Requisitos de seguridad:</p>
      <div className="grid gap-1.5">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`flex size-4 items-center justify-center rounded-full ${req.met ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
              {req.met ? (
                <Check className="size-3 text-green-600 stroke-[3]" />
              ) : (
                <X className="size-3 text-destructive stroke-[3]" />
              )}
            </div>
            <span className={`text-xs ${req.met ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
