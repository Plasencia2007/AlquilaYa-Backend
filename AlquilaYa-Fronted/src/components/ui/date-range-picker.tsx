'use client';

import * as React from 'react';
import { addMonths, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/cn';

export interface DateRangePreset {
  label: string;
  range: () => DateRange;
}

export const DEFAULT_DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    label: 'Este mes',
    range: () => ({ from: new Date(), to: endOfMonth(new Date()) }),
  },
  {
    label: 'Próximo ciclo',
    range: () => ({ from: new Date(), to: addMonths(new Date(), 6) }),
  },
];

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  presets?: DateRangePreset[];
  placeholder?: string;
  disabled?: React.ComponentProps<typeof Calendar>['disabled'];
  numberOfMonths?: number;
  className?: string;
}

function formatRangeLabel(value: DateRange | undefined, placeholder: string) {
  if (!value?.from) return placeholder;
  if (!value.to) return format(value.from, "d 'de' MMMM yyyy", { locale: es });
  return `${format(value.from, "d MMM", { locale: es })} – ${format(value.to, "d MMM yyyy", { locale: es })}`;
}

export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_DATE_RANGE_PRESETS,
  placeholder = 'Selecciona un rango de fechas',
  disabled,
  numberOfMonths = 2,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-11 w-full justify-start gap-2 text-left font-normal',
            !value?.from && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{formatRangeLabel(value, placeholder)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto space-y-3 p-3">
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.range())}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
        <Calendar
          mode="range"
          locale={es}
          selected={value}
          onSelect={onChange}
          defaultMonth={value?.from}
          numberOfMonths={numberOfMonths}
          disabled={disabled}
          showOutsideDays
        />
      </PopoverContent>
    </Popover>
  );
}
