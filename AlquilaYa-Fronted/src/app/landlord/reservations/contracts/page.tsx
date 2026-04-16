'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LANDLORD_CONTRACTS } from '@/mocks/landlord';

export default function LandlordContractsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">Mis Contratos</h1>
        <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">Gestión de documentos legales y acuerdos de alquiler.</p>
      </header>

      <Card variant="glass" padding="none" className="overflow-hidden border border-on-surface/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-on-surface/5 border-b border-on-surface/10">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Estudiante</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Cuarto</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Periodo</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Estado</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-on-surface/5">
            {LANDLORD_CONTRACTS.map((contract) => (
              <tr key={contract.id} className="hover:bg-on-surface/5 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-black text-on-surface/90">{contract.studentName}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-on-surface-variant">{contract.roomName}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-[11px] font-medium text-on-surface-variant opacity-70">
                    {contract.startDate} - {contract.endDate}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <Badge 
                    variant={contract.status === 'firmado' ? 'success' : contract.status === 'pendiente' ? 'warning' : 'outline'}
                    className="text-[10px] font-black uppercase"
                  >
                    {contract.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" className="text-blue-500 font-black text-[10px] uppercase tracking-wider">
                    {contract.status === 'firmado' ? 'Ver PDF' : 'Enviar Recordatorio'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      
      <div className="bg-blue-500/5 rounded-2xl p-6 border border-blue-500/10 max-w-2xl">
        <h4 className="font-black text-blue-500 text-[10px] mb-2 flex items-center gap-2 uppercase tracking-widest">
          <span className="material-symbols-outlined text-[16px]">info</span> Nota legal
        </h4>
        <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">
          Todos los contratos están encriptados y cumplen con la normativa de alquileres en Perú. Puedes descargar copias físicas en cualquier momento.
        </p>
      </div>
    </div>
  );
}
