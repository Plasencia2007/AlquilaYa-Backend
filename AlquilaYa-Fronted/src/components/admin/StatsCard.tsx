interface StatsCardProps {
  etiqueta: string;
  valor: string;
  cambio: number;
  etiquetaCambio: string;
  icon: string;
}

export default function StatsCard({ etiqueta, valor, cambio, etiquetaCambio, icon }: StatsCardProps) {
  const esPositivo = cambio >= 0;

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-7 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 group">
      <div className="flex items-start justify-between mb-8">
        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-white group-hover:rotate-6 shadow-sm">
          <span className="material-symbols-outlined text-[26px]">
            {icon}
          </span>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
          esPositivo 
            ? 'bg-green-50 text-green-600 border border-green-100' 
            : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          <span className="material-symbols-outlined text-[14px]">
            {esPositivo ? 'trending_up' : 'trending_down'}
          </span>
          {esPositivo ? '+' : ''}{cambio}%
        </div>
      </div>
      
      <p className="text-4xl font-black text-slate-900 tracking-tighter mb-1.5 font-heading">
        {valor}
      </p>
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
          {etiqueta}
        </p>
        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
        <p className="text-[10px] font-bold text-slate-400 opacity-60">
          {etiquetaCambio}
        </p>
      </div>
    </div>
  );
}
