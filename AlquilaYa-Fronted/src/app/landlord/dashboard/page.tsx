'use client';

import { StatCard } from '@/features/landlord/components/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/utils/cn';

export default function LandlordDashboardPage() {
  const { usuario } = useAuth();

  return (
    <div className="space-y-10 animate-fade-in py-4">
      
      {/* ── Minimalist Header ── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
            Hola, <span className="text-blue-500 font-black">{usuario?.nombre.split(' ')[0] || 'Socio'}</span>.
          </h1>
          <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">Vistazo rápido de tus operaciones.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="border border-on-surface/5 text-[10px] font-bold">Reporte</Button>
          <Button variant="dark" size="sm" className="bg-[#171E6B] hover:bg-[#1A237E] text-[10px] font-black px-5 rounded-full" leftIcon={<span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'wght' 300" }}>add</span>}>
            Nuevo Cuarto
          </Button>
        </div>
      </header>

      {/* ── Minimalist Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          titulo="Ingresos Totales" 
          valor="S/ 3,450" 
          tendencia={12.5} 
          icon="payments" 
          variant="minimal"
        />
        <StatCard 
          titulo="Ocupación" 
          valor="85%" 
          tendencia={2.3} 
          icon="meeting_room" 
          variant="minimal"
        />
        <StatCard 
          titulo="Vistas Totales" 
          valor="1,240" 
          tendencia={-5.4} 
          icon="visibility" 
          variant="minimal"
        />
        <StatCard 
          titulo="Mensajes" 
          valor="12" 
          tendencia={8.1} 
          icon="chat" 
          variant="minimal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* ── Active Properties (Main Section) ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-md font-black tracking-tight flex items-center gap-2 opacity-80">
              Tus Cuartos <span className="text-[9px] font-black text-blue-500 bg-blue-500/5 border border-blue-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-widest">4 Activos</span>
            </h2>
            <Button variant="ghost" size="sm" className="text-blue-500 font-black text-[10px] uppercase tracking-wider">Ver todos</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((id) => (
              <Card key={id} padding="none" className="group overflow-hidden border border-on-surface/5 hover:border-[#FF8A65]/30 transition-all duration-500 bg-white/40">
                <div className="relative h-44 overflow-hidden">
                  <img 
                    src={`https://images.unsplash.com/photo-${id === 1 ? '1522708323590-d24dbb6b0267' : '1502672260266-1c1ef2d93688'}?q=80&w=2070&auto=format&fit=crop`}
                    className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
                    alt="Property" 
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="glass" className="bg-white/90 text-on-surface border-none shadow-lg text-[11px] font-black">S/ {id === 1 ? '850' : '1,200'}/m</Badge>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-black text-md mb-1 truncate opacity-90">Habitación {id === 1 ? 'Premium Surco' : 'Studio San Isidro'}</h4>
                  <p className="text-[11px] text-on-surface-variant/70 font-medium flex items-center gap-1 mb-5">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'wght' 300" }}>location_on</span> Lima, Perú
                  </p>
                  <div className="flex items-center justify-between pt-5 border-t border-on-surface/5">
                    <div className="flex -space-x-1.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border border-white bg-on-surface/5 flex items-center justify-center text-[9px] font-black opacity-80 shadow-sm">U{i}</div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-500/5 border border-transparent hover:border-blue-500/20 rounded-lg px-4">Gestionar</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Activity & Sidebar Panel ── */}
        <div className="space-y-8">
          <Card variant="surface" padding="lg" className="border border-on-surface/5 bg-white/40">
            <h3 className="text-sm font-black tracking-tight mb-6 flex items-center gap-2 opacity-80">
              <span className="material-symbols-outlined text-blue-500 text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>history</span> Actividad
            </h3>
            <div className="space-y-8">
              {[
                { title: 'Nueva Reserva', time: 'Hace 5 min', details: 'Juan Pérez reservó en Surco', icon: 'check_circle', color: 'text-green-500' },
                { title: 'Nuevo Mensaje', time: 'Hace 2 horas', details: '¿Aceptas mascotas?', icon: 'chat', color: 'text-blue-400' },
                { title: 'Pago recibido', time: 'Ayer', details: 'S/ 850 - Hab. Miraflores', icon: 'payments', color: 'text-[#FF8A65]' },
              ].map((activity, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className={cn("w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-on-surface/5 transition-all group-hover:border-[#FF8A65]/50 shadow-sm", activity.color)}>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>{activity.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-on-surface/90">{activity.title}</p>
                    <p className="text-[11px] text-on-surface-variant/70 font-medium truncate mt-0.5">{activity.details}</p>
                    <p className="text-[9px] text-on-surface/20 font-black uppercase mt-1.5 tracking-widest">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-10 border-on-surface/5 text-[11px] font-black uppercase tracking-wider rounded-xl py-5" size="md">Historial Completo</Button>
          </Card>

          {/* Tips Card */}
          <Card variant="surface" className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6" padding="none">
            <h4 className="font-black text-blue-500 text-[10px] mb-2 flex items-center gap-2 uppercase tracking-widest">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'wght' 300" }}>lightbulb</span> Tip del día
            </h4>
            <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">
              Las propiedades con más de 5 fotos tienen un <span className="text-blue-500 font-black">40% más de reservas</span>.
            </p>
          </Card>
        </div>

      </div>
    </div>
  );
}
