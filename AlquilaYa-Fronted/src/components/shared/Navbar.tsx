'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { useAuthModal } from '@/features/auth/useAuthModal';
import { Menu, X, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { usuario, estaAutenticado, cerrarSesion, cargando } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const guestMenuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Manejadores de hover con retardo para suavidad
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setGuestMenuOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setGuestMenuOpen(false);
    }, 100); // 300ms de gracia para mover el ratón
  };

  // Rutas donde el Navbar principal NO debe aparecer
  // Usamos safe check para evitar crash si pathname es nulo durante la hidratación
  const hiddenRoutes = ['/login', '/register', '/admin-master', '/landlord'];
  const isHidden = pathname ? hiddenRoutes.some(route => pathname.startsWith(route)) : false;

  useEffect(() => {
    setIsMounted(true);

    const handlePageShow = () => {
      setIsMounted(true);
    };

    window.addEventListener('pageshow', handlePageShow);

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (guestMenuRef.current && !guestMenuRef.current.contains(event.target as Node)) {
        setGuestMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('pageshow', handlePageShow);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  if (isHidden) return null;

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-primary/10 px-6 sm:px-12 py-3.5 flex justify-between items-center transition-all duration-300 editorial-shadow">
      {/* ── Left Side: Logo & Navigation ── */}
      <div className="flex items-center gap-12">
        <Link href="/" className="flex items-center gap-2 group transition-transform active:scale-95">
          <span className="text-xl font-black tracking-tighter text-primary">
            Alquila<span className="text-primary-container">Ya</span>
          </span>
        </Link>

        <div className="hidden md:flex gap-12 items-center ml-4">
          <Link href="/" className={`font-['Manrope'] font-black text-xs tracking-[0.2em] transition-all ${pathname === '/' ? 'text-primary' : 'text-white hover:text-primary'}`}>
            INICIO
          </Link>
          <Link href="/search" className={`font-['Manrope'] font-black text-xs tracking-[0.2em] transition-all ${pathname === '/search' ? 'text-primary' : 'text-white hover:text-primary'}`}>
            EXPLORAR
          </Link>
          <Link href="#" className="font-['Manrope'] font-black text-xs tracking-[0.2em] text-white hover:text-primary transition-all">
            GARANTÍA
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!isMounted || cargando ? (
          /* ── Skeleton Loading State ── */
          <div className="flex gap-4 items-center">
            <div className="w-20 h-4 bg-white/5 rounded-full animate-pulse" />
          </div>
        ) : estaAutenticado && usuario ? (
          /* ── User Profile Menu ── */
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 hover:shadow-md transition-all group"
            >
              <div className="w-6 h-6 bg-primary text-on-primary rounded-full flex items-center justify-center text-[10px] font-bold shadow-inner">
                {usuario?.nombre.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-[10px] font-black tracking-widest text-on-background group-hover:text-primary">
                {usuario?.nombre.split(' ')[0].toUpperCase()}
              </span>
              <ChevronDown className={`w-3 h-3 text-on-background/40 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-variant rounded-xl shadow-2xl border border-white/5 py-2 animate-scale-in overflow-hidden z-[70] glass-nav">
                <div className="px-4 py-2 border-b border-white/5 mb-1">
                  <p className="text-xs font-bold text-on-surface">{usuario?.nombre}</p>
                  <p className="text-[10px] text-on-surface-variant">{usuario?.correo}</p>
                </div>

                {usuario?.rol === 'PROVEEDOR' ? (
                  <Link href="/landlord/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-on-surface hover:bg-white/5 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[18px]">dashboard</span>
                    PANEL DE CONTROL
                  </Link>
                ) : (
                  <>
                    <Link href="/student/favorites"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-on-surface hover:bg-white/5 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">favorite</span>
                      MIS FAVORITOS
                    </Link>
                    <Link href="/student/messages"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-on-surface hover:bg-white/5 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                      MIS CONTACTOS
                    </Link>
                    <Link href="/student/history"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-on-surface hover:bg-white/5 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                      HISTORIAL
                    </Link>
                  </>
                )}

                <div className="w-full h-px bg-white/5 my-1" />

                <Link href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-on-surface hover:bg-white/5 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  MI CUENTA
                </Link>

                <button
                  onClick={() => { cerrarSesion(); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors mt-1"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  SALIR
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Guest State (Dropdown Logic) ── */
          <div className="flex items-center gap-8">
            <Link href="#" className="hidden sm:block font-black text-xs tracking-[0.2em] text-white hover:text-primary transition-all">
              PUBLICAR
            </Link>

            <div
              className="relative py-1"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              ref={guestMenuRef}
            >
              <button
                onClick={() => openAuthModal('login')}
                className="hidden md:block bg-primary text-on-primary px-6 py-2 rounded-lg font-black text-xs tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-primary-container transition-all cursor-pointer"
              >
                INGRESAR
              </button>

              {/* Guest Dropdown Menu - Versión Compacta */}
              {guestMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-surface-variant rounded-xl shadow-2xl border border-white/5 p-4 animate-scale-in z-[60] glass-nav">
                  <p className="text-[11px] font-medium text-on-surface-variant mb-4 leading-relaxed">
                    Ingresa y accede a tus favoritos y mensajes guardados.
                  </p>

                  <button
                    onClick={() => { openAuthModal('login'); setGuestMenuOpen(false); }}
                    className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-black text-[10px] tracking-widest text-center block mb-4 shadow-lg shadow-primary/20 hover:bg-primary-container transition-all cursor-pointer"
                  >
                    INGRESAR
                  </button>

                  <div className="w-full h-px bg-white/5 mb-4" />

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => { openAuthModal('login'); setGuestMenuOpen(false); }}
                      className="flex items-center gap-3 text-[11px] font-bold text-on-surface hover:text-primary transition-colors group text-left w-full cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary">chat_bubble</span>
                      Mis contactos
                    </button>
                    <button 
                      onClick={() => { openAuthModal('login'); setGuestMenuOpen(false); }}
                      className="flex items-center gap-3 text-[11px] font-bold text-on-surface hover:text-primary transition-colors group text-left w-full cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary">favorite</span>
                      Favoritos
                    </button>
                    <button 
                      onClick={() => { openAuthModal('login'); setGuestMenuOpen(false); }}
                      className="flex items-center gap-3 text-[11px] font-bold text-on-surface hover:text-primary transition-colors group text-left w-full cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary">notifications</span>
                      Alertas
                    </button>
                    <button 
                      onClick={() => { openAuthModal('login'); setGuestMenuOpen(false); }}
                      className="flex items-center gap-3 text-[11px] font-bold text-on-surface hover:text-primary transition-colors group text-left w-full cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary">visibility</span>
                      Historial
                    </button>
                  </div>

                  <div className="w-full h-px bg-white/5 my-4" />

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => { openAuthModal('login'); setGuestMenuOpen(false); }}
                      className="flex items-center gap-2 text-[11px] font-bold text-on-surface hover:text-primary transition-colors group text-left w-full cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary">person</span>
                      Mi cuenta
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          className="md:hidden p-2 rounded-full hover:bg-white/5 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-on-background" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden bg-white animate-fade-in flex flex-col h-screen">
          {/* Mobile Header (Light) - FIJO en la parte superior */}
          <div className="p-6 flex justify-between items-center border-b border-slate-100 bg-white sticky top-0 z-20">
             <span className="text-2xl font-black tracking-tighter text-primary">
              Alquila<span className="text-slate-900">Ya</span>
            </span>
            <button 
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-8 h-8 text-slate-900" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-10 bg-white min-h-0">
              {!estaAutenticado && (
                <>
                  {/* Guest Header (White Theme) */}
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      Ingresa y accede a los avisos que contactaste, tus favoritos y las búsquedas guardadas.
                    </p>
                    <button 
                      onClick={() => { openAuthModal('login'); setMobileOpen(false); }}
                      className="w-full bg-primary text-white py-4 rounded-xl font-black text-sm tracking-widest text-center block shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                    >
                      INGRESAR
                    </button>
                  </div>

                  {/* Student Quick Links (Dark Text on White) */}
                  <div className="flex flex-col gap-2">
                    {[
                      { href: '/login', icon: 'chat_bubble', text: 'Mis contactos' },
                      { href: '/login', icon: 'favorite', text: 'Favoritos' },
                      { href: '/login', icon: 'notifications', text: 'Búsquedas y alertas' },
                      { href: '/login', icon: 'visibility', text: 'Historial' },
                      { href: '/login', icon: 'person', text: 'Mi cuenta' },
                    ].map((item) => (
                      <button 
                        key={item.text}
                        onClick={() => { openAuthModal('login'); setMobileOpen(false); }} 
                        className="flex items-center gap-4 text-base font-bold text-slate-900 hover:text-primary transition-colors py-4 border-b border-slate-50 group text-left w-full cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[24px] text-slate-400 group-hover:text-primary transition-colors">{item.icon}</span>
                        {item.text}
                      </button>
                    ))}
                  </div>

                  {/* Publicar Button (Featured) */}
                  <div className="pt-4">
                    <Link 
                      href="#" 
                      onClick={() => setMobileOpen(false)}
                      className="w-full border-2 border-primary text-primary py-4 rounded-xl font-black text-sm tracking-widest text-center block hover:bg-primary/5 transition-all"
                    >
                      PUBLICAR TU INMUEBLE
                    </Link>
                  </div>
                </>
              )}

              {estaAutenticado && usuario && (
                <div className="flex flex-col gap-6">
                  <div className="bg-slate-50 p-6 rounded-2xl flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center font-black text-white text-xl">
                      {usuario.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-lg">{usuario.nombre}</p>
                      <p className="text-sm text-slate-500 truncate w-48">{usuario.correo}</p>
                    </div>
                  </div>
                  {usuario.rol === 'PROVEEDOR' ? (
                    <Link href="/landlord/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 text-lg font-bold text-slate-900 py-3">
                      <span className="material-symbols-outlined text-slate-400">dashboard</span> PANEL DE CONTROL
                    </Link>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {[
                        { href: '/student/messages', icon: 'chat_bubble', text: 'Mis contactos' },
                        { href: '/student/favorites', icon: 'favorite', text: 'Favoritos' },
                        { href: '/student/alerts', icon: 'notifications', text: 'Búsquedas y alertas' },
                        { href: '/student/history', icon: 'visibility', text: 'Historial' },
                        { href: '/student/profile', icon: 'person', text: 'Mi cuenta' },
                      ].map((item) => (
                        <button 
                          key={item.text}
                          onClick={() => { router.push(item.href); setMobileOpen(false); }} 
                          className="flex items-center gap-4 text-base font-bold text-slate-900 hover:text-primary transition-colors py-4 border-b border-slate-50 group text-left w-full cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[24px] text-slate-400 group-hover:text-primary transition-colors">{item.icon}</span>
                          {item.text}
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { cerrarSesion(); setMobileOpen(false); }} className="flex items-center gap-4 text-lg font-bold text-primary text-left py-3 mt-4">
                    <span className="material-symbols-outlined font-black">logout</span> CERRAR SESIÓN
                  </button>
                </div>
              )}

              {/* Base Navigation Section (Base List) */}
              <div className="mt-auto pt-10 border-t border-slate-100 flex flex-col gap-6 pb-10">
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex justify-between items-center text-xl font-black tracking-widest text-slate-400 hover:text-primary transition-colors">
                  INICIO <ChevronDown className="-rotate-90 w-5 h-5 opacity-30" />
                </Link>
                <Link href="/search" onClick={() => setMobileOpen(false)} className="flex justify-between items-center text-xl font-black tracking-widest text-slate-400 hover:text-primary transition-colors">
                  EXPLORAR <ChevronDown className="-rotate-90 w-5 h-5 opacity-30" />
                </Link>
                <Link href="#" onClick={() => setMobileOpen(false)} className="flex justify-between items-center text-xl font-black tracking-widest text-slate-400 hover:text-primary transition-colors">
                  GARANTÍA <ChevronDown className="-rotate-90 w-5 h-5 opacity-30" />
                </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
