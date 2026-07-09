import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface SuccessScreenProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

/** Pantalla de éxito compartida (círculo + check + título + botón), usada por
 * reset-password y verify-email tras completar el flujo. */
export function SuccessScreen({ title, description, actionLabel, onAction }: SuccessScreenProps) {
  return (
    <div role="status" className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
        <CheckCircle2 className="size-12" aria-hidden />
      </div>
      <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">{description}</p>
      <Button onClick={onAction} className="mt-6 rounded-full shadow-lg shadow-primary/20">
        {actionLabel}
      </Button>
    </div>
  );
}
