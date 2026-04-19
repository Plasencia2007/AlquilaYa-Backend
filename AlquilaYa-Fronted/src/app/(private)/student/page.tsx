'use client';

import { useAuthStore } from '@/features/auth/useAuthStore';
import VerificationPanel from '@/features/auth/VerificationPanel';
import { Card } from '@/components/ui/Card';
import { User, Bookmark, History, Settings } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboardPage() {
  const { usuario } = useAuthStore();

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#281721] tracking-tighter uppercase">
            Mi Perfil de <span className="text-[#8f0304]">Estudiante</span>
          </h1>
          <p className="text-[#bda5a8] text-sm font-medium mt-1">
            Gestiona tu cuenta, favoritos y verifica tu identidad para alquilar con confianza.
          </p>
        </div>
        
        <div className="flex gap-4">
           <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl border border-[#f2ede9] shadow-sm">
              <div className="w-10 h-10 bg-[#8f0304]/10 rounded-xl flex items-center justify-center text-[#8f0304]">
                 <User size={20} />
              </div>
              <div>
                 <p className="text-xs font-black text-[#281721] uppercase tracking-widest">{usuario?.nombre}</p>
                 <p className="text-[10px] text-[#bda5a8] font-bold">{usuario?.correo}</p>
              </div>
           </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-8">
          <VerificationPanel />

          <div className="grid md:grid-cols-2 gap-4 text-center">
             <Link href="/student/favorites" className="p-8 bg-white rounded-[2rem] border border-[#f2ede9] hover:border-[#8f0304]/30 hover:shadow-xl hover:shadow-[#8f0304]/5 transition-all group">
                <Bookmark className="mx-auto mb-4 text-[#bda5a8] group-hover:text-[#8f0304] transition-colors" size={32} />
                <h4 className="font-black text-[#281721] uppercase tracking-widest text-sm">Favoritos</h4>
                <p className="text-xs text-[#bda5a8] mt-2">Cuartos que guardaste para después.</p>
             </Link>
             <Link href="/student/history" className="p-8 bg-white rounded-[2rem] border border-[#f2ede9] hover:border-[#8f0304]/30 hover:shadow-xl hover:shadow-[#8f0304]/5 transition-all group">
                <History className="mx-auto mb-4 text-[#bda5a8] group-hover:text-[#8f0304] transition-colors" size={32} />
                <h4 className="font-black text-[#281721] uppercase tracking-widest text-sm">Historial</h4>
                <p className="text-xs text-[#bda5a8] mt-2">Tus reservas y visitas pasadas.</p>
             </Link>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <Card className="bg-[#281721] text-white p-8 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Settings size={120} />
              </div>
              <div className="relative z-10">
                 <h3 className="text-xl font-black uppercase tracking-tighter mb-4">¿Por qué verificar?</h3>
                 <p className="text-sm text-white/70 leading-relaxed font-medium">
                    Los estudiantes verificados con <span className="text-[#8f0304] font-bold">Carné Universitario</span> tienen prioridad en las solicitudes y acceso a precios exclusivos de la red AlquilaYa.
                 </p>
                 <button className="mt-8 px-6 py-3 bg-white text-[#281721] text-xs font-black rounded-xl uppercase tracking-widest hover:bg-gray-100 transition-all">
                    Leer más
                 </button>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
