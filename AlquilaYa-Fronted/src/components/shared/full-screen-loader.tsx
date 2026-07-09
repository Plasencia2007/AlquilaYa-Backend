interface FullScreenLoaderProps {
  label?: string;
}

/** Loader a pantalla completa para guards de ruta/rol mientras se valida la sesión. */
export function FullScreenLoader({ label = 'Cargando…' }: FullScreenLoaderProps) {
  return (
    <div role="status" className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
