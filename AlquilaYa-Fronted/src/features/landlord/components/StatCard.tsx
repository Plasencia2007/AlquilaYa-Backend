import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  titulo: string;
  valor: string;
  tendencia: number;
  icon: string;
  variant?: 'default' | 'minimal';
}

export function StatCard({ titulo, valor, tendencia, icon, variant = 'default' }: StatCardProps) {
  const esPositivo = tendencia > 0;

  return (
    <div className="bg-white/40 backdrop-blur-md border border-on-surface/5 p-6 rounded-3xl flex flex-col gap-4 group transition-all duration-300 hover:bg-white/60 hover:shadow-xl hover:shadow-primary/5">
      <div className="flex justify-between items-start">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-500 border border-on-surface/5 transition-all group-hover:bg-blue-500 group-hover:text-white shadow-sm">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{icon}</span>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg",
          esPositivo ? "text-green-600 bg-green-500/5" : "text-red-600 bg-red-500/5"
        )}>
          {esPositivo ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(tendencia)}%
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-on-surface/30 uppercase tracking-[0.2em] mb-1">{titulo}</p>
        <h3 className="text-2xl font-black text-on-surface tracking-tighter opacity-90">{valor}</h3>
      </div>
    </div>
  );
}
