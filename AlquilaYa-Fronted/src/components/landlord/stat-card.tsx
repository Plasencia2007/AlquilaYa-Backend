import { cn } from '@/lib/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  titulo: string;
  valor: string;
  /** Variación porcentual. Si es null/undefined no se muestra el indicador. */
  tendencia?: number | null;
  icon: string;
  /** Sublabel opcional cuando no hay tendencia (ej. "12 activos"). */
  subtitulo?: string;
  variant?: 'default' | 'minimal';
}

export function StatCard({ titulo, valor, tendencia, icon, subtitulo }: StatCardProps) {
  const tieneTendencia = typeof tendencia === 'number' && tendencia !== 0;
  const esPositivo = (tendencia ?? 0) > 0;

  return (
    <div className="bg-white border border-border p-5 rounded-md flex flex-col gap-4 group transition-colors duration-200 hover:border-foreground/20">
      <div className="flex justify-between items-start">
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-primary border border-border transition-colors group-hover:bg-primary group-hover:text-white">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{icon}</span>
        </div>
        {tieneTendencia ? (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
            esPositivo ? "text-green-600 bg-green-500/5 border-green-500/20" : "text-red-600 bg-red-500/5 border-red-500/20"
          )}>
            {esPositivo ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(tendencia as number)}%
          </div>
        ) : subtitulo ? (
          <span className="text-[10px] font-medium text-muted-foreground">{subtitulo}</span>
        ) : null}
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{titulo}</p>
        <h3 className="text-2xl font-bold text-foreground tracking-tight opacity-90">{valor}</h3>
      </div>
    </div>
  );
}
