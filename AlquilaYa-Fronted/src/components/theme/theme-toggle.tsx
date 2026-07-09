'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useThemeStore, type ThemePreference } from '@/stores/theme-store';
import { cn } from '@/lib/cn';

const OPCIONES: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Monitor },
];

/** Toggle de tema de 3 estados (Claro/Oscuro/Sistema) — el modo "Sistema" ya
 * era soportado por el store pero era inaccesible desde la UI (ítem 26). */
export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemeStore((s) => s.preference);
  const resolved = useThemeStore((s) => s.resolved);
  const setPreference = useThemeStore((s) => s.setPreference);

  const IconoActual = preference === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Elegir tema"
          title="Elegir tema"
          className={cn(className)}
        >
          <IconoActual className="size-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPCIONES.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setPreference(value)}
            className="gap-2"
          >
            <Icon className="size-4" aria-hidden />
            <span className="flex-1">{label}</span>
            {preference === value && <Check className="size-4 text-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
