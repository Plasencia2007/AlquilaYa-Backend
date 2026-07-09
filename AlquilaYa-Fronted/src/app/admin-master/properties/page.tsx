export default function AdminPropertiesPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
        <div>
          <span className="text-secondary font-bold tracking-[0.2em] uppercase text-[10px] mb-2 block">Giga-Control de Activos</span>
          <h1 className="text-4xl font-black text-foreground tracking-tighter">Validación de Propiedades</h1>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[3rem] p-20 text-center editorial-shadow max-w-4xl mx-auto">
        <div className="w-24 h-24 bg-secondary/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner group overflow-hidden">
          <span className="material-symbols-outlined text-4xl text-secondary transition-transform group-hover:scale-110">apartment</span>
        </div>
        <h2 className="text-2xl font-black text-foreground mb-3 tracking-tight">Módulo de Verificación en Proceso</h2>
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed font-medium">
          Estamos construyendo una interfaz de auditoría de alto nivel para revisar fotos, documentos legales y amenidades antes de la publicación oficial.
        </p>
        <div className="mt-12 flex justify-center gap-4">
          <div className="px-6 py-3 bg-muted rounded-full border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Priority Update: Next Sprint
          </div>
        </div>
      </div>
    </div>
  );
}

