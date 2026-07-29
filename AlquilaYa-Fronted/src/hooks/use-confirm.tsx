'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, type LucideIcon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export type ConfirmTone = 'primary' | 'success' | 'danger' | 'neutral';

export interface ConfirmReasonOption {
  nombre: string;
  valor?: string;
}

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  requireReason?: boolean;
  predefinedReasons?: ConfirmReasonOption[];
  reasonPlaceholder?: string;
  onConfirm: (reason?: string) => void | boolean | Promise<void | boolean>;
}

const TONE_BUTTON: Record<ConfirmTone, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  neutral: 'bg-foreground text-background hover:bg-foreground/90',
};

const TONE_ACCENT: Record<ConfirmTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-light text-success',
  danger: 'bg-destructive/10 text-destructive',
  neutral: 'bg-foreground/10 text-foreground',
};

const TONE_ICON: Record<ConfirmTone, LucideIcon> = {
  primary: HelpCircle,
  success: CheckCircle2,
  danger: AlertTriangle,
  neutral: HelpCircle,
};

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [reasonSelected, setReasonSelected] = useState('');

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setReasonText('');
    setReasonSelected('');
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const tone = options?.tone ?? 'primary';
  const hasPredefined = !!options?.predefinedReasons?.length;
  const showTextArea = !hasPredefined || reasonSelected === 'OTRO';
  const reasonInvalid =
    !!options?.requireReason &&
    (showTextArea ? reasonText.trim().length < 4 : !reasonSelected);

  const handleConfirm = async () => {
    if (!options || reasonInvalid) return;
    const finalReason = options.requireReason
      ? showTextArea
        ? reasonText.trim()
        : reasonSelected
      : undefined;

    setLoading(true);
    try {
      const result = await options.onConfirm(finalReason);
      if (result !== false) setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const Icon = TONE_ICON[tone];

  const ConfirmDialog = options ? (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) close();
      }}
    >
      <AlertDialogContent className="max-w-md rounded-2xl">
        <AlertDialogHeader className="flex-row items-start gap-4 space-y-0 text-left sm:text-left">
          <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', TONE_ACCENT[tone])}>
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            {options.description && (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            )}
          </div>
        </AlertDialogHeader>

        {options.requireReason && (
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
              Motivo
            </label>
            {hasPredefined && (
              <select
                value={reasonSelected}
                onChange={(e) => setReasonSelected(e.target.value)}
                disabled={loading}
                className="h-11 w-full rounded-xl border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              >
                <option value="">Selecciona un motivo...</option>
                {options.predefinedReasons!.map((r, idx) => (
                  <option key={idx} value={r.nombre}>
                    {r.nombre}
                  </option>
                ))}
                <option value="OTRO">Otro motivo...</option>
              </select>
            )}
            {showTextArea && (
              <>
                <textarea
                  rows={3}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder={options.reasonPlaceholder ?? 'Cuéntanos el motivo…'}
                  maxLength={300}
                  disabled={loading}
                  className="w-full resize-none rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground opacity-60">
                  <span>Mínimo 4 caracteres.</span>
                  <span>{reasonText.length}/300</span>
                </div>
              </>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <Button type="button" variant="ghost" onClick={close} disabled={loading}>
            {options.cancelLabel ?? 'Cancelar'}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={reasonInvalid || loading}
            className={TONE_BUTTON[tone]}
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {options.confirmLabel ?? 'Confirmar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null;

  return { confirm, ConfirmDialog };
}
