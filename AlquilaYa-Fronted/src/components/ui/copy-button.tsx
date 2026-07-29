'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';

async function copiarAlPortapapeles(valor: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(valor);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = valor;
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const ok = document.execCommand('copy');
    if (!ok) throw new Error('execCommand copy falló');
  } finally {
    document.body.removeChild(textarea);
  }
}

interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  value: string;
  label?: string;
  copiedLabel?: string;
  hideLabel?: boolean;
  errorMessage?: string;
  onCopiedChange?: (copiado: boolean) => void;
}

/** Botón de copiar al portapapeles compartido (#67): feedback con ícono Check ~2s y fallback `execCommand` para contextos no-secure (http). */
export function CopyButton({
  value,
  label = 'Copiar',
  copiedLabel = 'Copiado',
  hideLabel = false,
  errorMessage = 'No se pudo copiar.',
  variant = 'outline',
  size = 'sm',
  className,
  onCopiedChange,
  ...props
}: CopyButtonProps) {
  const [copiado, setCopiado] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const copiar = async () => {
    try {
      await copiarAlPortapapeles(value);
      setCopiado(true);
      onCopiedChange?.(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCopiado(false);
        onCopiedChange?.(false);
      }, 2000);
    } catch {
      notify.error(null, errorMessage);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn('gap-1.5', className)}
      onClick={copiar}
      aria-label={hideLabel ? (copiado ? copiedLabel : label) : undefined}
      {...props}
    >
      {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
      {!hideLabel && (copiado ? copiedLabel : label)}
    </Button>
  );
}
