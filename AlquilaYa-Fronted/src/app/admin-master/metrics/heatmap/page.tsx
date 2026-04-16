'use client';

export default function AdminPlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-primary text-3xl">map</span>
      </div>
      <h1 className="text-3xl font-black text-on-surface tracking-tighter mb-2">Mapa de Calor</h1>
      <p className="text-on-surface-variant font-medium opacity-70 max-w-md">
        Visualiza dónde se concentra la demanda de alquileres en tiempo real.
      </p>
    </div>
  );
}
