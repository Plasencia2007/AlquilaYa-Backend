'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuthModal } from './useAuthModal';
import { useAuth } from './useAuth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AuthModal() {
  const { isOpen, view, close, toggleView } = useAuthModal();
  const { iniciarSesion } = useAuth();
  
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [nombre, setNombre] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync animation state when view changes
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 550);
    return () => clearTimeout(timer);
  }, [view]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const exito = await iniciarSesion(correo, contrasena);
    if (exito) {
      close();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Intento de registro', { nombre, correo, contrasena });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#281721]/60 backdrop-blur-sm animate-fade-in" 
        onClick={close}
      />

      {/* Modal Container */}
      <div
        className={cn(
          "relative z-[210] w-full max-w-[900px] md:h-[580px] bg-[#e8e3df] md:rounded-[2.5rem] rounded-t-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_28px_70px_-15px_rgba(40,23,33,0.55)] transition-all duration-500",
          isAnimating && "scale-[0.98] opacity-90"
        )}
      >
        {/* Close Button (All devices) */}
        <button 
          onClick={close}
          className="absolute top-6 right-6 text-[#474c64] hover:text-[#281721] transition-colors z-50 p-2"
        >
          <X size={24} />
        </button>

        {/* ── Form Panel ── */}
        <div 
          className={cn(
            "w-full md:w-1/2 relative bg-[#e8e3df] overflow-hidden transition-all duration-550 flex flex-col justify-center px-8 md:px-12 py-12",
            view === 'register' ? "md:order-2" : "md:order-1"
          )}
          style={{ minHeight: '520px' }}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[#bb373b]/10 blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute -bottom-12 -right-8 w-40 h-40 rounded-full bg-[#c96d6c]/10 blur-2xl animate-pulse pointer-events-none" style={{ animationDelay: '1.2s' }} />

          {/* Login Content */}
          <div className={cn(
            "space-y-6 transition-all duration-500",
            view === 'login' ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[-30px] pointer-events-none absolute inset-x-12"
          )}>
            <div>
              <h2 className="font-headline font-bold text-[1.85rem] text-[#281721] tracking-tight mb-1.5">
                Bienvenido de vuelta
              </h2>
              <p className="text-[#bda5a8] text-sm font-medium">
                Ingresa tus datos para continuar.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#bda5a8] group-focus-within:text-[#8f0304] transition-colors text-[20px]">mail</span>
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full bg-[#f2ede9] text-[#1d1b19] placeholder:text-[#bda5a8] rounded-xl pl-12 pr-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] focus:bg-white transition-all outline-none"
                />
              </div>

              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#bda5a8] group-focus-within:text-[#8f0304] transition-colors text-[20px]">lock</span>
                <input
                  type={mostrarContrasena ? "text" : "password"}
                  placeholder="Contraseña"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full bg-[#f2ede9] text-[#1d1b19] placeholder:text-[#bda5a8] rounded-xl pl-12 pr-12 py-3.5 text-sm border border-transparent focus:border-[#8f0304] focus:bg-white transition-all outline-none"
                />
                <button 
                  type="button" 
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#bda5a8] hover:text-[#8f0304] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">{mostrarContrasena ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>

              <div className="flex justify-end">
                <a href="#" className="text-xs font-semibold text-[#8f0304] hover:text-[#ba0405] transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-[#8f0304] hover:bg-[#ba0405] text-white font-semibold rounded-full py-4 transition-all shadow-[0_8px_24px_-8px_rgba(143,3,4,0.5)] active:scale-95"
              >
                Ingresar
              </button>

              <div className="text-center mt-6">
                <p className="text-sm text-[#474c64]">
                  ¿Aún no tienes cuenta?
                  <button type="button" onClick={toggleView} className="font-semibold text-[#8f0304] hover:text-[#ba0405] ml-1 transition-colors">
                    Únete ahora
                  </button>
                </p>
              </div>
            </form>
          </div>

          {/* Register Content */}
          <div className={cn(
            "space-y-6 transition-all duration-500",
            view === 'register' ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[30px] pointer-events-none absolute inset-x-12"
          )}>
            <div>
              <h2 className="font-headline font-bold text-[1.85rem] text-[#281721] tracking-tight mb-1.5">
                Crea tu cuenta
              </h2>
              <p className="text-[#bda5a8] text-sm font-medium">
                Únete a AlquilaYa en menos de un minuto.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleRegister}>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#bda5a8] group-focus-within:text-[#8f0304] transition-colors text-[20px]">person</span>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-[#f2ede9] text-[#1d1b19] placeholder:text-[#bda5a8] rounded-xl pl-12 pr-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] focus:bg-white transition-all outline-none"
                />
              </div>

              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#bda5a8] group-focus-within:text-[#8f0304] transition-colors text-[20px]">mail</span>
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full bg-[#f2ede9] text-[#1d1b19] placeholder:text-[#bda5a8] rounded-xl pl-12 pr-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] focus:bg-white transition-all outline-none"
                />
              </div>

              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#bda5a8] group-focus-within:text-[#8f0304] transition-colors text-[20px]">lock</span>
                <input
                  type={mostrarContrasena ? "text" : "password"}
                  placeholder="Contraseña"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full bg-[#f2ede9] text-[#1d1b19] placeholder:text-[#bda5a8] rounded-xl pl-12 pr-12 py-3.5 text-sm border border-transparent focus:border-[#8f0304] focus:bg-white transition-all outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#8f0304] hover:bg-[#ba0405] text-white font-semibold rounded-full py-4 transition-all shadow-[0_8px_24px_-8px_rgba(143,3,4,0.5)] active:scale-95"
              >
                Empezar ahora
              </button>

              <div className="text-center mt-6">
                <p className="text-sm text-[#474c64]">
                  ¿Ya eres miembro?
                  <button type="button" onClick={toggleView} className="font-semibold text-[#8f0304] hover:text-[#ba0405] ml-1 transition-colors">
                    Inicia sesión
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* ── Image Panel ── */}
        <div 
          className={cn(
            "hidden md:block w-1/2 relative bg-[#281721] overflow-hidden transition-all duration-550",
            view === 'register' ? "md:order-1" : "md:order-2"
          )}
        >
          <img
            alt="Cozy room"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#281721] via-[#281721]/40 to-transparent shadow-inner" />

          {/* Image content */}
          <div className="absolute inset-0 flex flex-col justify-between p-12 z-20">
            <div className="font-headline font-extrabold text-2xl text-white tracking-tighter">
              AlquilaYa
            </div>
            <div className="max-w-xs">
              <p className="font-headline font-bold text-3xl text-white leading-tight mb-4">
                "Tu próximo hogar te está esperando"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-1.5 bg-[#8f0304] rounded-full" />
                <span className="text-white/60 text-sm font-medium tracking-wide">Busca, elige, alquila.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
