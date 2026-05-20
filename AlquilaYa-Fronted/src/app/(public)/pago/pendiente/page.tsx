'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function PagoPendientePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Clock className="size-20 text-yellow-500" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Pago en proceso</h1>
        <p className="text-muted-foreground">
          Tu pago está siendo procesado (por ejemplo, pago en efectivo en agente).
          Cuando se confirme, tu reserva pasará automáticamente a estado{' '}
          <strong>PAGADA</strong>. No necesitas hacer nada más.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/student/reservations">Ver mis reservas</Link>
      </Button>
    </div>
  );
}
