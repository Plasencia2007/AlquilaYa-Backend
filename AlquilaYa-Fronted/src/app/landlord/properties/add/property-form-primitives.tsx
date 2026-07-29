'use client';

import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';

import { type ItemCatalogo } from '@/services/catalogos-service';
import { cn } from '@/lib/cn';
import { resolveIcon } from './property-form-icons';

// =============================================================================
// Section
// =============================================================================

interface SectionProps {
  step: number;
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function Section({ step, icon, title, subtitle, children }: SectionProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 rounded-t-2xl overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[17px] text-accent-foreground">
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-bold tracking-[0.2em] text-muted-foreground uppercase tabular-nums">
              {String(step).padStart(2, '0')}
            </span>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

// =============================================================================
// Field
// =============================================================================

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  const autoId = useId();
  const errorId = useId();

  // Ítem 406: la mayoría de los usos de `Field` envuelven un único control (InputField,
  // NumberInput, un <textarea> nativo o CustomSelect) que hasta ahora no tenía `id` ni
  // vínculo con el mensaje de error — el <label> tampoco tenía `htmlFor`, así que quedaba
  // suelto sin asociación programática. Cuando el hijo es un único elemento le inyectamos
  // `id` (respetando uno explícito si el caller ya lo puso) y, si hay error, `aria-describedby`
  // apuntando al <p> de abajo + `aria-invalid`. Si el hijo no es un elemento único (raro), no
  // se toca nada — el fallback es el comportamiento anterior.
  let fieldId: string | undefined;
  let content = children;
  if (isValidElement(children)) {
    const childProps = children.props as { id?: string; 'aria-describedby'?: string };
    fieldId = childProps.id ?? autoId;
    content = cloneElement(children, {
      id: fieldId,
      'aria-describedby': error
        ? [childProps['aria-describedby'], errorId].filter(Boolean).join(' ')
        : childProps['aria-describedby'],
      'aria-invalid': error ? true : undefined,
    } as Record<string, unknown>);
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"
      >
        {label}
        {required && <span className="text-destructive text-[13px] leading-none">*</span>}
        {hint && (
          <span className="normal-case tracking-normal font-normal opacity-60 ml-0.5">
            · {hint}
          </span>
        )}
      </label>
      {content}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] font-semibold text-destructive flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-bottom-2 duration-400"
        >
          <span className="material-symbols-outlined text-[13px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// InputField — native input con tokens correctos
// =============================================================================

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  error?: boolean;
}

export function InputField({ icon, error, className, ...props }: InputFieldProps) {
  return (
    <div className="relative">
      {icon && (
        <span
          className={cn(
            'material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[17px] pointer-events-none transition-colors',
            error ? 'text-destructive/50' : 'text-muted-foreground',
          )}
        >
          {icon}
        </span>
      )}
      <input
        className={cn(
          'w-full bg-input border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50',
          'py-2.5 px-4 outline-none transition-all',
          'focus:ring-2 focus:ring-primary/20 focus:border-primary',
          icon && 'pl-10',
          error
            ? 'border-destructive/60 focus:ring-destructive/20 focus:border-destructive'
            : 'border-border hover:border-primary/40',
          className,
        )}
        {...props}
      />
    </div>
  );
}

// =============================================================================
// CustomSelect
// =============================================================================

interface CustomSelectProps<T extends string> {
  value: T | '';
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: string; description?: string }>;
  placeholder?: string;
  error?: string;
  /** Inyectados por `Field` (ítem 406) para linkear el trigger con su <label> y su mensaje de error. */
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  error,
  id,
  'aria-describedby': ariaDescribedby,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-describedby={ariaDescribedby}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-3 bg-input border rounded-xl py-2.5 px-4 text-sm text-left outline-none transition-all',
          error
            ? 'border-destructive/60'
            : open
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-primary/40',
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.icon && (
            <span className="material-symbols-outlined text-[16px] text-muted-foreground shrink-0">
              {selected.icon}
            </span>
          )}
          <span
            className={cn(
              'truncate text-sm',
              selected ? 'text-foreground font-medium' : 'text-muted-foreground/50',
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <span
          className={cn(
            'material-symbols-outlined text-[18px] text-muted-foreground transition-transform shrink-0',
            open && 'rotate-180',
          )}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
          <ul className="max-h-64 overflow-y-auto py-1">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-start gap-2.5 px-3 py-2.5 text-sm text-left transition-colors',
                      active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-foreground',
                    )}
                  >
                    {opt.icon && (
                      <span
                        className={cn(
                          'material-symbols-outlined text-[15px] mt-0.5 shrink-0',
                          active ? 'text-accent-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {opt.icon}
                      </span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium leading-tight">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-[11px] opacity-60 mt-0.5">
                          {opt.description}
                        </span>
                      )}
                    </span>
                    {active && (
                      <span className="material-symbols-outlined text-[15px] text-accent-foreground shrink-0">
                        check
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ChipsMultiselect
// =============================================================================

interface ChipsMultiselectProps {
  items: ItemCatalogo[];
  selected: string[];
  onToggle: (valor: string) => void;
  emptyHint?: string;
}

export function ChipsMultiselect({ items, selected, onToggle, emptyHint }: ChipsMultiselectProps) {
  if (!items.length) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {emptyHint ?? 'No hay opciones disponibles aún.'}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isOn = selected.includes(item.valor);
        return (
          <button
            key={item.id ?? item.valor}
            type="button"
            onClick={() => onToggle(item.valor)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all',
              isOn
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-foreground border-border hover:border-primary/60 hover:text-primary',
            )}
          >
            {resolveIcon(item.icono) && (
              <span className="material-symbols-outlined text-[13px]">{resolveIcon(item.icono)}</span>
            )}
            {item.nombre}
            {isOn && (
              <span className="material-symbols-outlined text-[11px] ml-0.5">check</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Switch
// =============================================================================

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      title={label}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// =============================================================================
// CustomItemInput
// =============================================================================

interface CustomItemInputProps {
  items: string[];
  onAdd: (text: string) => void;
  onRemove: (text: string) => void;
  maxItems?: number;
  maxChars?: number;
  placeholder?: string;
}

export function CustomItemInput({
  items,
  onAdd,
  onRemove,
  maxItems = 3,
  maxChars = 60,
  placeholder = 'Escribe y presiona Enter…',
}: CustomItemInputProps) {
  const [inputValue, setInputValue] = useState('');
  const canAdd = items.length < maxItems;

  const commit = () => {
    const v = inputValue.trim();
    if (!v || v.length > maxChars) return;
    if (items.some((i) => i.toLowerCase() === v.toLowerCase())) return;
    if (!canAdd) return;
    onAdd(v);
    setInputValue('');
  };

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold bg-amber-50 border border-amber-200 text-amber-800"
            >
              <span className="material-symbols-outlined text-[12px]">edit_note</span>
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="ml-0.5 hover:text-amber-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[11px]">close</span>
              </button>
            </span>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit();
                }
              }}
              maxLength={maxChars}
              placeholder={placeholder}
              className={cn(
                'w-full bg-input border border-border rounded-xl text-sm text-foreground',
                'py-2.5 px-4 outline-none transition-all',
                'focus:ring-2 focus:ring-primary/20 focus:border-primary',
                'placeholder:text-muted-foreground/50',
                inputValue.length > 0 && 'pr-14',
              )}
            />
            {inputValue.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums pointer-events-none">
                {inputValue.length}/{maxChars}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={commit}
            disabled={!inputValue.trim() || inputValue.length > maxChars}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
      )}

      {!canAdd && (
        <p className="text-[11px] text-muted-foreground">
          Máximo {maxItems} ítems personalizados.
        </p>
      )}
    </div>
  );
}

export function SkeletonChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="h-8 rounded-full bg-muted animate-pulse" style={{ width: `${60 + (i % 3) * 20}px` }} />
      ))}
    </div>
  );
}
