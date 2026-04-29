'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/legacy-button';
import { cn } from '@/lib/cn';

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estilo visual del botón principal. Default: primary (azul). */
  tone?: 'primary' | 'success' | 'danger' | 'neutral';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  isLoading?: boolean;
  onConfirm: (reason?: string) => void | Promise<void>;
  onCancel: () => void;
}

const TONE_BUTTON: Record<NonNullable<ConfirmActionModalProps['tone']>, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  success: 'bg-green-600 text-white hover:bg-green-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  neutral: 'bg-on-surface text-surface hover:bg-on-surface/90',
};

const TONE_ACCENT: Record<NonNullable<ConfirmActionModalProps['tone']>, string> = {
  primary: 'text-blue-500 bg-blue-500/10',
  success: 'text-green-600 bg-green-500/10',
  danger: 'text-red-600 bg-red-500/10',
  neutral: 'text-on-surface bg-on-surface/10',
};

const TONE_ICON: Record<NonNullable<ConfirmActionModalProps['tone']>, string> = {
  primary: 'help',
  success: 'task_alt',
  danger: 'warning',
  neutral: 'help',
};

export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  requireReason = false,
  reasonPlaceholder = 'Cuéntale al estudiante por qué…',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  const [reason, setReason] = useState('');

  // Reset cuando se abre
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, isLoading, onCancel]);

  if (!open) return null;

  const reasonInvalido = requireReason && reason.trim().length < 4;

  const handleConfirm = async () => {
    if (reasonInvalido) return;
    await onConfirm(requireReason ? reason.trim() : undefined);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isLoading && onCancel()}
      />
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-2xl border border-on-surface/5 p-6 sm:p-8 animate-scale-in">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              TONE_ACCENT[tone],
            )}
          >
            <span className="material-symbols-outlined text-[20px]">
              {TONE_ICON[tone]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="confirm-modal-title"
              className="text-lg font-black text-on-surface tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="text-[13px] text-on-surface-variant font-medium mt-1.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {requireReason && (
          <div className="mt-5">
            <label
              htmlFor="confirm-modal-reason"
              className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-70 mb-2"
            >
              Motivo
            </label>
            <textarea
              id="confirm-modal-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              maxLength={300}
              disabled={isLoading}
              className="w-full rounded-2xl bg-surface-container-low border border-on-surface/10 px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
            />
            <div className="flex justify-between mt-1.5">
              <p className="text-[10px] text-on-surface-variant opacity-60">
                Mínimo 4 caracteres.
              </p>
              <p className="text-[10px] text-on-surface-variant opacity-60">
                {reason.length}/300
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={isLoading}
            disabled={reasonInvalido || isLoading}
            onClick={handleConfirm}
            className={TONE_BUTTON[tone]}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmActionModal;
