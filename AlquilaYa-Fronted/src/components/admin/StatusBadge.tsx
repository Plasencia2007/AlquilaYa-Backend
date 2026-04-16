interface StatusBadgeProps {
  status: 'ACTIVO' | 'PENDIENTE' | 'CRITICO';
}

const STATUS_CONFIG = {
  ACTIVO: {
    base: 'bg-success/5 text-success border-success/10',
    dot: 'bg-success',
    label: 'Activo'
  },
  PENDIENTE: {
    base: 'bg-warning/5 text-warning border-warning/10',
    dot: 'bg-warning',
    label: 'Pendiente'
  },
  CRITICO: {
    base: 'bg-error/5 text-error border-error/10',
    dot: 'bg-error',
    label: 'Crítico'
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${config.base}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 shadow-sm ${config.dot}`} />
      {config.label}
    </span>
  );
}
