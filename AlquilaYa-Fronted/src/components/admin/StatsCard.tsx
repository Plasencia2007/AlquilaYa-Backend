interface StatsCardProps {
  etiqueta: string;
  valor: string;
  cambio?: number;
  etiquetaCambio?: string;
  icon: string;
}

export default function StatsCard({ etiqueta, valor, cambio, etiquetaCambio, icon }: StatsCardProps) {
  const tieneTrend = typeof cambio === 'number';
  const esPositivo = (cambio ?? 0) >= 0;

  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 hover:border-slate-300 transition-colors group">
      <div className="flex items-start justify-between mb-6">
        <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-slate-500 transition-colors group-hover:bg-primary group-hover:text-white group-hover:border-primary">
          <span className="material-symbols-outlined text-[22px]">
            {icon}
          </span>
        </div>
        {tieneTrend && (
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
            esPositivo
              ? 'bg-green-50 text-green-600 border-green-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            <span className="material-symbols-outlined text-[13px]">
              {esPositivo ? 'trending_up' : 'trending_down'}
            </span>
            {esPositivo ? '+' : ''}{cambio}%
          </div>
        )}
      </div>

      <p className="text-3xl font-bold text-slate-900 tracking-tight mb-1 font-heading">
        {valor}
      </p>
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {etiqueta}
        </p>
        {etiquetaCambio && (
          <>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <p className="text-[10px] font-medium text-slate-400">
              {etiquetaCambio}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
