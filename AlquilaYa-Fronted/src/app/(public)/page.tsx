'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/useAuth';
import { useAuthModal } from '@/features/auth/useAuthModal';
import { MOCK_PROPIEDADES } from '@/mocks/propiedades';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

export default function Home() {
  const { estaAutenticado, usuario, cargando } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && estaAutenticado && usuario) {
      if (usuario.rol === 'PROVEEDOR') {
        router.replace('/landlord/dashboard');
      } else if (usuario.rol === 'ADMIN') {
        router.replace('/admin-master');
      }
    }
  }, [estaAutenticado, usuario, cargando, router]);

  const destacados = MOCK_PROPIEDADES.filter(p => p.disponible).slice(0, 3);

  // Solo mostramos el spinner si el rol requiere redirección inmediata (evita flicker)
  const requiereRedireccion = usuario && (usuario.rol === 'PROVEEDOR' || usuario.rol === 'ADMIN');

  if (!cargando && estaAutenticado && requiereRedireccion) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero Section ── */}
      <section className="relative min-h-[90vh] flex items-center px-6 sm:px-12 overflow-hidden mb-12">
        <div className="absolute inset-0 z-0">
          <img 
            alt="Modern living" 
            className="w-full h-full object-cover" 
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-4xl animate-fade-in py-20">
          <span className="text-secondary font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs mb-4 block">
            Curated Living for the Modern Professional
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-[5rem] font-extrabold leading-[1.1] md:leading-[1] tracking-tighter text-white mb-10 max-w-2xl">
            Encuentra tu próximo hogar con <span className="text-secondary">AlquilaYa</span>.
          </h1>

          {/* Glass Search Bar - Responsive Design */}
          <Card variant="glass" padding="none" className="flex flex-col md:flex-row gap-0 max-w-3xl backdrop-blur-[24px] pointer-events-auto p-1.5 rounded-2xl md:rounded-full border-white/10 bg-white/5" hoverable={false}>
            <div className="flex-1 flex items-center px-6 gap-3 py-4 border-b md:border-b-0 md:border-r border-white/10">
              <span className="material-symbols-outlined text-secondary">location_on</span>
              <input 
                className="bg-transparent border-none focus:outline-none w-full placeholder:text-on-background/30 font-medium text-on-background text-sm" 
                placeholder="¿Dónde quieres vivir?" 
                type="text"
              />
            </div>
            <div className="flex-1 flex items-center px-6 gap-3 py-4">
              <span className="material-symbols-outlined text-secondary">calendar_today</span>
              <input 
                className="bg-transparent border-none focus:outline-none w-full placeholder:text-on-background/30 font-medium text-on-background text-sm" 
                placeholder="Fecha de ingreso" 
                type="text"
              />
            </div>
            <Button size="lg" className="rounded-xl md:rounded-full px-12 py-5 md:py-4 shadow-xl shadow-primary/20 w-full md:w-auto" leftIcon={<span className="material-symbols-outlined">search</span>}>
              Buscar
            </Button>
          </Card>
        </div>
      </section>

      {/* ── Habitaciones Destacadas (Bento Grid) ── */}
      <section className="py-16 md:py-24 px-6 sm:px-12 bg-surface-container-lowest">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-on-surface">Habitaciones Destacadas</h2>
            <p className="text-on-surface-variant max-w-lg text-base md:text-lg italic">Residencias seleccionadas a mano para el máximo confort.</p>
          </div>
          <Link href="/search" className="text-primary font-bold flex items-center gap-2 group transition-all text-sm md:text-base">
            Explorar todas 
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Large Hero Card (Bento Style) */}
          {destacados[0] && (
            <Card padding="none" className="md:col-span-2 relative aspect-[4/3] md:aspect-auto md:min-h-[600px] group" hoverable>
              <img 
                src={destacados[0].imagenes[0]} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                alt={destacados[0].titulo}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-on-surface/95 via-on-surface/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6 md:p-12 text-white w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="flex-1">
                  <Badge variant="secondary" className="mb-4 text-[10px] md:text-xs">
                    MÁS POPULAR
                  </Badge>
                  <h3 className="text-2xl md:text-5xl font-black mb-3 leading-tight">{destacados[0].titulo}</h3>
                  <p className="flex items-center gap-2 opacity-90 text-sm md:text-lg">
                    <span className="material-symbols-outlined text-sm md:text-lg">location_on</span> {destacados[0].ubicacion}
                  </p>
                </div>
                <div className="w-full md:w-auto flex justify-between md:flex-col items-center md:items-end gap-2 text-right shrink-0">
                  <p className="text-2xl md:text-5xl font-black">S/ {destacados[0].precio}<span className="text-xs md:text-lg font-normal opacity-70">/mes</span></p>
                  <Button variant="white" size="lg" className="px-8 md:px-10 rounded-xl" asChild>
                    <Link href={`/property/${destacados[0].id}`}>Ver detalles</Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Stacked Vertical Cards */}
          <div className="flex flex-col gap-8">
            {destacados.slice(1, 3).map((propiedad) => (
              <Card key={propiedad.id} padding="none" className="flex flex-col flex-1 group">
                <div className="relative h-48 md:h-56 overflow-hidden">
                  <img src={propiedad.imagenes[0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={propiedad.titulo} />
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1 text-xs font-bold text-on-surface shadow-sm">
                    <span className="material-symbols-outlined text-yellow-500 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    {propiedad.calificacion}
                  </div>
                </div>
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <h4 className="font-bold text-lg md:text-xl text-on-surface leading-tight">{propiedad.titulo}</h4>
                      <p className="font-black text-primary text-base md:text-lg whitespace-nowrap">S/ {propiedad.precio}</p>
                    </div>
                    <p className="text-xs md:text-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs md:text-sm text-outline">location_on</span>
                      {propiedad.ubicacion}
                    </p>
                  </div>
                  <Link href={`/property/${propiedad.id}`} className="text-primary font-bold flex items-center gap-1 hover:underline mt-6 text-xs md:text-sm group/btn">
                    Conocer más <span className="material-symbols-outlined text-xs md:text-sm transition-transform group-hover/btn:translate-x-1">chevron_right</span>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── User Types Section ── */}
      <section className="py-20 md:py-32 px-6 sm:px-12 bg-surface">
        <div className="text-center mb-16 md:mb-24 animate-fade-in max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tighter leading-tight">Diseñado para cada necesidad</h2>
          <p className="text-on-surface-variant text-base md:text-xl">Una plataforma, tres experiencias personalizadas que conectan el futuro.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Students Card */}
          <Card padding="lg" className="text-center flex flex-col items-center group">
            <div className="w-20 h-20 bg-primary-fixed rounded-3xl flex items-center justify-center mb-10 shadow-inner transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-4xl">school</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black mb-4">Estudiantes</h3>
            <p className="text-on-surface-variant mb-10 leading-relaxed text-sm md:text-lg">Encuentra el cuarto ideal cerca de tu universidad. Filtra por precio y reseñas reales.</p>
            <ul className="space-y-4 text-left w-full mb-10 border-t border-white/5 pt-8">
              <li className="flex items-center gap-4 text-xs md:text-sm font-semibold text-on-surface/80"><span className="material-symbols-outlined text-primary text-lg">check_circle</span> Búsqueda inteligente</li>
              <li className="flex items-center gap-4 text-xs md:text-sm font-semibold text-on-surface/80"><span className="material-symbols-outlined text-primary text-lg">check_circle</span> Filtros Universitarios</li>
            </ul>
            <Button 
              variant="outline" 
              size="xl" 
              className="w-full rounded-xl"
              onClick={() => {
                if (!estaAutenticado) openAuthModal('register');
                else router.push('/search');
              }}
            >
              {estaAutenticado ? 'Explorar' : 'Empezar a buscar'}
            </Button>
          </Card>

          {/* Providers Card (Premium Dark) */}
          <Card padding="lg" variant="surface" className="bg-primary text-on-primary text-center flex flex-col items-center relative overflow-hidden shadow-2xl shadow-primary/30 group">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-10 shadow-inner transition-transform group-hover:rotate-6">
              <span className="material-symbols-outlined text-white text-4xl">real_estate_agent</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black mb-4">Proveedores</h3>
            <p className="text-on-primary/80 mb-10 leading-relaxed text-sm md:text-lg">Monetiza tus espacios vacíos de forma profesional y eficiente desde tu celular.</p>
            <ul className="space-y-4 text-left w-full mb-10 border-t border-white/10 pt-8">
              <li className="flex items-center gap-4 text-xs md:text-sm font-semibold"><span className="material-symbols-outlined text-white/70 text-lg">check_circle</span> Dashboard de gestión</li>
              <li className="flex items-center gap-4 text-xs md:text-sm font-semibold"><span className="material-symbols-outlined text-white/70 text-lg">check_circle</span> Pagos automatizados</li>
            </ul>
            <Button variant="white" size="xl" className="w-full rounded-xl">
              Publicar mi cuarto
            </Button>
          </Card>

          {/* Admin Card */}
          <Card padding="lg" className="text-center flex flex-col items-center group">
            <div className="w-20 h-20 bg-secondary-fixed rounded-3xl flex items-center justify-center mb-10 shadow-inner group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-4xl">shield_person</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black mb-4">Administradores</h3>
            <p className="text-on-surface-variant mb-10 leading-relaxed text-sm md:text-lg">Control total sobre la plataforma. Valida usuarios y analiza métricas en tiempo real.</p>
            <ul className="space-y-4 text-left w-full mb-10 border-t border-white/5 pt-8">
              <li className="flex items-center gap-4 text-xs md:text-sm font-semibold text-on-surface/80"><span className="material-symbols-outlined text-secondary text-lg">check_circle</span> Moderación Avanzada</li>
              <li className="flex items-center gap-4 text-xs md:text-sm font-semibold text-on-surface/80"><span className="material-symbols-outlined text-secondary text-lg">check_circle</span> Reportes de IA</li>
            </ul>
            <Button variant="outline" size="xl" className="w-full border-secondary text-secondary hover:bg-secondary hover:text-on-secondary rounded-xl">
              Gestión Central
            </Button>
          </Card>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 md:py-32 px-6 sm:px-12 relative overflow-hidden">
        <Card padding="none" variant="surface" className="bg-surface-container-highest flex flex-col lg:flex-row items-center border-none overflow-hidden" hoverable={false}>
          <div className="flex-1 p-10 md:p-20 text-center lg:text-left">
            <h2 className="text-4xl md:text-[5rem] font-extrabold leading-[1.1] mb-8 tracking-tighter">Convierte tu espacio en ingresos.</h2>
            <p className="text-base md:text-2xl text-on-surface-variant mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed italic">Únete a cientos de proveedores que confían en AlquilaYa.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="xl" className="px-10 rounded-xl w-full sm:w-auto">
                Publicar mi cuarto
              </Button>
              <Button variant="ghost" size="xl" className="px-10 border border-outline-variant/30 bg-white rounded-xl w-full sm:w-auto">
                Guía completa
              </Button>
            </div>
          </div>
          <div className="flex-1 w-full h-[350px] lg:h-full lg:min-h-[600px] relative">
            <img 
              alt="Happy Provider" 
              className="absolute inset-0 w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1557053910-d9eadeed1c58?q=80&w=1974&auto=format&fit=crop"
            />
          </div>
        </Card>
      </section>
    </main>
  );
}
