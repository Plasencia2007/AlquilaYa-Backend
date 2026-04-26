'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/cn';

interface Props {
  initialValue?: string;
  onSubmit: (zona: string) => void;
  placeholder?: string;
  /** Si true, dispara `onSubmit` automáticamente al dejar de tipear (debounced). */
  autoSubmit?: boolean;
  className?: string;
}

export function SearchBar({
  initialValue = '',
  onSubmit,
  placeholder = 'Busca por zona, distrito o nombre…',
  autoSubmit = true,
  className,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const debounced = useDebounce(value, 350);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!autoSubmit) return;
    if (debounced === initialValue) return;
    onSubmit(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value.trim());
      }}
      className={cn('relative flex items-center gap-2', className)}
      role="search"
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar cuartos"
          className="h-12 rounded-full bg-card pl-11 pr-4 text-sm shadow-sm"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="hidden h-12 rounded-full px-6 text-sm font-bold shadow-lg shadow-primary/20 sm:inline-flex"
      >
        Buscar
      </Button>
    </form>
  );
}
