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
    base: 'bg-destructive/5 text-destructive border-destructive/10',
    dot: 'bg-destructive',
    label: 'Crítico'
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors ${config.base}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${config.dot}`} />
      {config.label}
    </span>
  );
}
