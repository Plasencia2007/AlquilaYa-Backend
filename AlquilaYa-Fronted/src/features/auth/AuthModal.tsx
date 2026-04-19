'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { useAuthModal } from './useAuthModal';
import { useAuth } from './useAuth';
import { useRouter } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';
import { Mail, Lock, User, CheckCircle, Smartphone, Hash, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema, type LoginFormData, type RegisterFormData } from '@/validations/authSchema';

const MapPicker = dynamic(() => import('@/components/shared/MapPicker'), { 
  ssr: false,
  loading: () => <div className="w-full h-[200px] bg-[#f2ede9] animate-pulse rounded-xl flex items-center justify-center text-xs text-[#bda5a8]">Cargando mapa...</div>
});

export default function AuthModal() {
  const { isOpen, view, targetRole, close, toggleView, open: openAuthModal } = useAuthModal();
  const { iniciarSesion, registrarse } = useAuth();
  const router = useRouter();

  // React Hook Form - Login
  const { 
    register: loginForm, 
    handleSubmit: handleLoginSubmit, 
    formState: { errors: loginErrors } 
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  // React Hook Form - Register
  const { 
    register: regForm, 
    handleSubmit: handleRegisterSubmit, 
    formState: { errors: regErrors },
    setValue: setRegValue,
    watch: watchReg
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      rol: 'ESTUDIANTE'
    }
  });

  const telefono = watchReg('telefono');
  
  // Detalle Estudiante (Keep manual for now as they are in detalhesPerfil map)
  const [universidad, setUniversidad] = useState('');
  const [codigoEstudiante, setCodigoEstudiante] = useState('');
  const [carrera, setCarrera] = useState('');
  const [ciclo, setCiclo] = useState('');

  // Detalle Arrendador
  const [ruc, setRuc] = useState('');
  const [direccionCuartos, setDireccionCuartos] = useState('');
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  const [currentRol, setCurrentRol] = useState<'ESTUDIANTE' | 'ARRENDADOR'>('ESTUDIANTE');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarContrasenaReg, setMostrarContrasenaReg] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [step, setStep] = useState(0); // 0: Marketing(AR), 1: Cuenta, 2: Perfil, 3: WhatsApp OTP
  const [otpCodigo, setOtpCodigo] = useState('');
  const [errorOtp, setErrorOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    setCurrentRol(targetRole);
    setRegValue('rol', targetRole);
    if (view === 'register') {
      setStep(targetRole === 'ARRENDADOR' ? 0 : 1);
    } else {
      setStep(1);
    }
    const timer = setTimeout(() => setIsAnimating(false), 550);
    return () => clearTimeout(timer);
  }, [view, targetRole, setRegValue]);

  const redirectByRole = (role: string) => {
    switch (role) {
      case 'ADMIN': router.push('/admin-master'); break;
      case 'ARRENDADOR': router.push('/landlord/dashboard'); break;
      case 'ESTUDIANTE': default: router.push('/'); break;
    }
  };

  const handleLogin = async (data: LoginFormData) => {
    const usuario = await iniciarSesion(data.correo, data.password);
    if (usuario) {
      redirectByRole(usuario.rol);
      close();
    }
  };

  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'User-Agent': 'AlquilaYa-App' }
      });
      const data = await response.json();
      if (data.display_name) {
        setDireccionCuartos(data.display_name);
      }
    } catch (error) {
      console.error("Error en reverse geocoding:", error);
    }
  };

  const onMapMove = useCallback((lat: number, lng: number) => {
    setLatitud(lat);
    setLongitud(lng);
    handleReverseGeocode(lat, lng);
  }, []);

  const nextStep = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setIsAnimating(false);
    }, 300);
  };

  const handleDetectLocation = () => {
    setObteniendoUbicacion(true);
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización");
      setObteniendoUbicacion(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLatitud(latitude);
        setLongitud(longitude);
        handleReverseGeocode(latitude, longitude);
        setObteniendoUbicacion(false);
      },
      (err) => {
        console.error("Error obteniendo ubicación:", err);
        alert("No pudimos obtener tu ubicación. Por favor, asegúrate de dar permisos.");
        setObteniendoUbicacion(false);
      }
    );
  };

  const handleRegister = async (data: RegisterFormData) => {
    if (step === 1) {
      nextStep();
      return;
    }

    const detallesPerfil = currentRol === 'ESTUDIANTE' 
      ? { universidad, codigoEstudiante, carrera, ciclo }
      : { 
          ruc, 
          direccionCuartos, 
          latitud, 
          longitud, 
          esEmpresa: ruc.length > 0 
        };

    try {
      const usuario = await registrarse(data.nombre, data.apellido, data.dni, data.correo, data.password, data.rol, detallesPerfil, data.telefono || ''); 
; 
      if (usuario) {
        // En lugar de cerrar el modal, pasamos al paso de verificación OTP
        nextStep();
      }
    } catch (err) {
      console.error("Error en registro:", err);
      alert("No se pudo completar el registro. Verifica tus datos.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCodigo.length !== 6) return;
    
    setIsVerifying(true);
    setErrorOtp('');

    try {
      const response = await fetch('http://localhost:8080/api/v1/usuarios/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: telefono || '', codigo: otpCodigo })
      });

      if (response.ok) {
        // Verificación exitosa
        alert("¡Cuenta verificada con éxito!");
        close();
        router.push(currentRol === 'ARRENDADOR' ? '/landlord/dashboard' : '/');
      } else {
        const errorMsg = await response.text();
        setErrorOtp(errorMsg || "Código incorrecto");
      }
    } catch (err) {
      setErrorOtp("Error de conexión con el servidor");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#281721]/60 backdrop-blur-sm animate-fade-in" onClick={close} />

      {/* Modal Container */}
      <div className={cn(
        "relative z-[210] w-full max-w-[900px] md:h-[620px] bg-[#e8e3df] md:rounded-[2.5rem] rounded-t-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_28px_70px_-15px_rgba(40,23,33,0.55)] transition-all duration-500",
        isAnimating && "scale-[0.98] opacity-90"
      )}>
        {/* Close Button */}
        <button onClick={close} className="absolute top-6 right-6 text-[#474c64] hover:text-[#281721] transition-colors z-50 p-2">
          <X size={24} />
        </button>

        {/* ── Panel Izquierdo (Visual / Marketing) ── */}
        <div className={cn(
          "hidden md:block w-1/2 relative bg-[#281721] overflow-hidden transition-all duration-550 shrink-0",
          view === 'register' ? "order-1" : "order-2"
        )}>
          {step === 0 && currentRol === 'ARRENDADOR' ? (
            <div className="absolute inset-0 z-20 flex flex-col justify-center p-12 bg-[#8f0304]">
              <h2 className="text-4xl font-black text-white leading-tight mb-8">Haz crecer tu negocio con AlquilaYa</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-white/90">
                  <span className="material-symbols-outlined text-3xl">payments</span>
                  <div>
                    <p className="font-bold text-sm">Pagos Garantizados</p>
                    <p className="text-xs opacity-70">Olvídate de las cobranzas manuales.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-white/90">
                  <span className="material-symbols-outlined text-3xl">dashboard</span>
                  <div>
                    <p className="font-bold text-sm">Control Total</p>
                    <p className="text-xs opacity-70">Dashboard profesional para gestionar tus cuartos.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-white/90">
                  <span className="material-symbols-outlined text-3xl">verified</span>
                  <div>
                    <p className="font-bold text-sm">Visibilidad Top</p>
                    <p className="text-xs opacity-70">Llega a miles de estudiantes verificados.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 pt-8 border-t border-white/10">
                <p className="italic text-white/60 text-sm">"AlquilaYa cambió la forma en que gestiono mis inmuebles. Todo es más simple."</p>
                <p className="text-xs font-bold text-white mt-2">— Carlos P., Arrendador en Lima</p>
              </div>
            </div>
          ) : (
            <>
              <img
                alt="Cozy room"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#281721] via-[#281721]/40 to-transparent shadow-inner" />
              <div className="absolute inset-x-0 bottom-0 p-12 z-20">
                <p className="font-headline font-bold text-3xl text-white leading-tight mb-4 tracking-tight">"Tu próximo hogar te está esperando"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-1.5 bg-[#8f0304] rounded-full" />
                  <span className="text-white/60 text-sm font-medium tracking-wide">Busca, elige, alquila.</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Panel Derecho (Formularios) ── */}
        <div className={cn(
          "w-full md:w-1/2 relative bg-[#e8e3df] overflow-hidden transition-all duration-550 flex flex-col justify-center px-8 md:px-12 py-12",
          view === 'register' ? "order-2" : "order-1"
        )} style={{ minHeight: '520px' }}>
          
          {/* ── View: LOGIN ── */}
          <div className={cn(
            "space-y-6 transition-all duration-500",
            view === 'login' ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[-30px] pointer-events-none absolute inset-x-12"
          )}>
            <div>
              <h2 className="font-headline font-bold text-3xl text-[#281721] tracking-tight mb-2">Bienvenido</h2>
              <p className="text-[#bda5a8] text-sm font-medium">Ingresa para gestionar tus favoritos y mensajes.</p>
            </div>

            <form className="space-y-4" onSubmit={handleLoginSubmit(handleLogin)}>
              <div className="space-y-1">
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#bda5a8] group-focus-within:text-[#8f0304] transition-colors text-[20px]">mail</span>
                  <input 
                    {...loginForm('correo')}
                    type="email" 
                    placeholder="Correo electrónico" 
                    className={cn(
                      "w-full bg-[#f2ede9] text-[#1d1b19] placeholder:text-[#bda5a8] rounded-xl pl-12 pr-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] focus:bg-white transition-all outline-none",
                      loginErrors.correo && "border-red-500 bg-red-50/10"
                    )} 
                  />
                </div>
                {loginErrors.correo && <p className="text-[10px] text-red-500 font-bold px-1 flex items-center gap-1"><AlertCircle size={10} /> {loginErrors.correo.message}</p>}
              </div>

              <div className="space-y-1">
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#bda5a8] group-focus-within:text-[#8f0304] transition-colors text-[20px]">lock</span>
                  <input 
                    {...loginForm('password')}
                    type={mostrarContrasena ? "text" : "password"} 
                    placeholder="Contraseña" 
                    className={cn(
                      "w-full bg-[#f2ede9] text-[#1d1b19] placeholder:text-[#bda5a8] rounded-xl pl-12 pr-12 py-3.5 text-sm border border-transparent focus:border-[#8f0304] focus:bg-white transition-all outline-none",
                      loginErrors.password && "border-red-500 bg-red-50/10"
                    )}
                  />
                  <button type="button" onClick={() => setMostrarContrasena(!mostrarContrasena)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#bda5a8] hover:text-[#8f0304] transition-colors">
                    <span className="material-symbols-outlined text-[20px]">{mostrarContrasena ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {loginErrors.password && <p className="text-[10px] text-red-500 font-bold px-1 flex items-center gap-1"><AlertCircle size={10} /> {loginErrors.password.message}</p>}
              </div>

              <div className="flex justify-between items-center px-1">
                <button type="button" onClick={() => { setCurrentRol('ARRENDADOR'); setStep(0); openAuthModal('register', 'ARRENDADOR'); }} className="text-[10px] font-bold text-[#bda5a8] hover:text-[#8f0304] transition-colors uppercase tracking-widest">
                  Acceso Arrendadores
                </button>
                <a href="#" className="text-xs font-semibold text-[#8f0304] hover:text-[#ba0405] transition-colors">¿Olvidaste tu contraseña?</a>
              </div>

              <button type="submit" className="w-full bg-[#8f0304] hover:bg-[#ba0405] text-white font-bold rounded-full py-4 transition-all shadow-xl shadow-[#8f0304]/20 active:scale-95">
                Ingresar
              </button>

              <div className="text-center pt-4">
                <p className="text-sm text-[#474c64]">¿No tienes cuenta? <button type="button" onClick={() => { setCurrentRol('ESTUDIANTE'); toggleView(); }} className="font-bold text-[#8f0304] hover:text-[#ba0405] transition-colors">Únete ahora</button></p>
              </div>
            </form>
          </div>

          {/* ── View: REGISTER ── */}
          <div className={cn(
            "space-y-6 transition-all duration-500 w-full",
            view === 'register' ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[30px] pointer-events-none absolute inset-x-12"
          )}>
            
            {/* Registro Paso 0: Info Arrendador */}
            {step === 0 && currentRol === 'ARRENDADOR' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-3xl font-black text-[#281721] tracking-tight leading-tight">Únete a la red más grande de alquileres</h2>
                  <p className="text-[#bda5a8] text-sm mt-3 leading-relaxed">Publica tus espacios, automatiza tus ingresos y gestiona todo desde un solo lugar.</p>
                </div>
                <div className="space-y-4">
                   <div className="p-4 bg-white/50 rounded-2xl border border-white/20 flex gap-4">
                      <span className="material-symbols-outlined text-primary">groups</span>
                      <p className="text-xs font-medium text-[#474c64]">+50,000 estudiantes buscando hospedaje activamente cada mes.</p>
                   </div>
                </div>
                <button onClick={() => setStep(1)} className="w-full bg-[#8f0304] hover:bg-[#ba0405] text-white font-bold rounded-full py-5 transition-all shadow-xl shadow-[#8f0304]/20 active:scale-95 flex items-center justify-center gap-2">
                  Empezar ahora <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            )}

            {/* Registro Paso 1: Datos Cuenta */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="font-headline font-bold text-2xl text-[#281721] tracking-tight">Crea tu cuenta</h2>
                  <p className="text-[#bda5a8] text-sm">{currentRol === 'ARRENDADOR' ? 'Regístrate como arrendador profesional.' : 'Únete como estudiante en segundos.'}</p>
                </div>

                <form className="grid grid-cols-2 gap-3" onSubmit={handleRegisterSubmit(handleRegister)}>
                  <div className="col-span-1 space-y-1">
                    <input 
                      {...regForm('nombre')}
                      type="text" 
                      placeholder="Nombre" 
                      className={cn(
                        "w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl px-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none",
                        regErrors.nombre && "border-red-500"
                      )} 
                    />
                    {regErrors.nombre && <p className="text-[9px] text-red-500 font-bold px-1">{regErrors.nombre.message}</p>}
                  </div>
                  <div className="col-span-1 space-y-1">
                    <input 
                      {...regForm('apellido')}
                      type="text" 
                      placeholder="Apellido" 
                      className={cn(
                        "w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl px-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none",
                        regErrors.apellido && "border-red-500"
                      )} 
                    />
                    {regErrors.apellido && <p className="text-[9px] text-red-500 font-bold px-1">{regErrors.apellido.message}</p>}
                  </div>
                  
                  <div className="col-span-1 space-y-1">
                    <input 
                      {...regForm('dni')}
                      type="text" 
                      placeholder="DNI" 
                      maxLength={8}
                      className={cn(
                        "w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl px-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none",
                        regErrors.dni && "border-red-500"
                      )} 
                    />
                    {regErrors.dni && <p className="text-[9px] text-red-500 font-bold px-1">{regErrors.dni.message}</p>}
                  </div>

                  <div className="col-span-1 space-y-1">
                    <PhoneInput
                      international
                      defaultCountry="PE"
                      value={telefono}
                      onChange={(val) => setRegValue('telefono', val || '')}
                      className={cn("alquilaya-phone-input !py-[5px] !rounded-xl", regErrors.telefono && "border-red-500")}
                    />
                    {regErrors.telefono && <p className="text-[9px] text-red-500 font-bold px-1">{regErrors.telefono.message}</p>}
                  </div>

                  <div className="col-span-2 space-y-1">
                    <input 
                      {...regForm('correo')}
                      type="email" 
                      placeholder="Correo" 
                      className={cn(
                        "w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl px-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none",
                        regErrors.correo && "border-red-500"
                      )} 
                    />
                    {regErrors.correo && <p className="text-[9px] text-red-500 font-bold px-1">{regErrors.correo.message}</p>}
                  </div>

                  <div className="col-span-2 space-y-1">
                    <div className="relative">
                      <input 
                        {...regForm('password')}
                        type={mostrarContrasenaReg ? "text" : "password"} 
                        placeholder="Contraseña" 
                        className={cn(
                          "w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl pl-4 pr-12 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none",
                          regErrors.password && "border-red-500"
                        )} 
                      />
                      <button type="button" onClick={() => setMostrarContrasenaReg(!mostrarContrasenaReg)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#bda5a8] hover:text-[#8f0304] transition-colors">
                        <span className="material-symbols-outlined text-[20px]">{mostrarContrasenaReg ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {regErrors.password && <p className="text-[9px] text-red-500 font-bold px-1">{regErrors.password.message}</p>}
                  </div>
                  
                  <button type="submit" className="col-span-2 mt-2 w-full bg-[#8f0304] hover:bg-[#ba0405] text-white font-bold rounded-full py-4 transition-all active:scale-95">
                    Siguiente paso
                  </button>
                </form>
                
                <div className="text-center">
                  <button onClick={toggleView} className="text-xs font-bold text-[#bda5a8] hover:text-[#8f0304] transition-colors">¿Ya eres miembro? Inicia sesión</button>
                </div>
              </div>
            )}

            {/* Registro Paso 2: Detalles Perfil */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="font-headline font-bold text-2xl text-[#281721] tracking-tight">Casi terminamos</h2>
                  <p className="text-[#bda5a8] text-sm">Necesitamos estos datos para verificar tu perfil.</p>
                </div>

                <form className="space-y-4" onSubmit={handleRegisterSubmit(handleRegister)}>
                  {currentRol === 'ESTUDIANTE' ? (
                    <>
                      <input type="text" placeholder="Universidad" value={universidad} onChange={(e) => setUniversidad(e.target.value)} className="w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl px-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none" required />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Código" value={codigoEstudiante} onChange={(e) => setCodigoEstudiante(e.target.value)} className="w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl px-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none" required />
                        <input type="text" placeholder="Ciclo (1-12)" value={ciclo} onChange={(e) => setCiclo(e.target.value)} className="w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl px-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none" required />
                      </div>
                      <input type="text" placeholder="Carrera" value={carrera} onChange={(e) => setCarrera(e.target.value)} className="w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl px-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none" required />
                    </>
                  ) : (
                    <>
                      <input type="text" placeholder="RUC (Para facturación, opcional)" value={ruc} onChange={(e) => setRuc(e.target.value)} className="w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl px-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none" />
                      <div className="space-y-2">
                        <div className="relative">
                          <input type="text" placeholder="Dirección de tus cuartos (Ubicación)" value={direccionCuartos} onChange={(e) => setDireccionCuartos(e.target.value)} className="w-full bg-[#f2ede9] text-[#1d1b19] rounded-xl px-4 py-3.5 text-sm border border-transparent focus:border-[#8f0304] outline-none pr-10" required />
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#bda5a8] text-sm">location_on</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={handleDetectLocation}
                          disabled={obteniendoUbicacion}
                          className={`flex items-center gap-2 text-[11px] font-bold transition-all ${latitud ? 'text-green-600' : 'text-[#8f0304] hover:opacity-80'}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {obteniendoUbicacion ? 'sync' : latitud ? 'check_circle' : 'my_location'}
                          </span>
                          {obteniendoUbicacion ? 'Obteniendo GPS...' : latitud ? 'Ubicación GPS capturada' : 'Detectar mi ubicación GPS exacta'}
                        </button>
                        {latitud && longitud && (
                          <div className="space-y-2 animate-scale-in">
                            <div className="text-[10px] text-[#bda5a8] flex justify-between px-1">
                              <div className="flex gap-2">
                                <span>Lat: {latitud.toFixed(4)}</span>
                                <span>Long: {longitud.toFixed(4)}</span>
                              </div>
                              <span className="text-[#8f0304] font-bold">Puedes mover el marcador</span>
                            </div>
                            <MapPicker lat={latitud} lng={longitud} onPositionChange={onMapMove} />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <button type="submit" className="w-full bg-[#8f0304] hover:bg-[#ba0405] text-white font-bold rounded-full py-4 transition-all shadow-xl shadow-[#8f0304]/20 active:scale-95">
                    Finalizar Registro
                  </button>
                  <button type="button" onClick={() => setStep(1)} className="w-full text-xs font-bold text-[#bda5a8] py-2 hover:text-[#8f0304] transition-colors">Volver</button>
                </form>
              </div>
            )}

            {/* Registro Paso 3: Verificación OTP */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Smartphone className="text-green-600 w-10 h-10" />
                </div>
                <div>
                  <h2 className="font-headline font-bold text-2xl text-[#281721] tracking-tight">Verifica tu WhatsApp</h2>
                  <p className="text-[#bda5a8] text-sm max-w-[280px] mx-auto mt-2 text-center">
                    Hemos enviado un código de 6 dígitos al número <span className="font-bold text-[#281721] tracking-wider">{telefono}</span>
                  </p>
                </div>

                <form className="w-full space-y-6" onSubmit={handleVerifyOtp}>
                  <div className="relative group max-w-[240px] mx-auto">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bda5a8] group-focus-within:text-[#8f0304] transition-colors w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="000000" 
                      maxLength={6}
                      value={otpCodigo} 
                      onChange={(e) => setOtpCodigo(e.target.value.replace(/\D/g, ''))} 
                      className="w-full bg-[#f2ede9] text-[#1d1b19] placeholder:text-[#bda5a8] rounded-xl pl-12 pr-4 py-4 text-2xl font-black tracking-[0.5em] border border-transparent focus:border-[#8f0304] focus:bg-white transition-all outline-none text-center" 
                      required 
                    />
                  </div>

                  {errorOtp && (
                    <p className="text-red-500 text-xs font-bold animate-shake">{errorOtp}</p>
                  )}

                  <button 
                    type="submit" 
                    disabled={isVerifying || otpCodigo.length !== 6}
                    className="w-full bg-[#8f0304] hover:bg-[#ba0405] text-white font-bold rounded-full py-4 transition-all shadow-xl shadow-[#8f0304]/20 disabled:opacity-50 disabled:scale-100"
                  >
                    {isVerifying ? 'Verificando...' : 'Confirmar Código'}
                  </button>

                  <p className="text-[11px] text-[#bda5a8]">
                    ¿No recibiste el mensaje? <button type="button" className="text-[#8f0304] font-bold">Reenviar código</button>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
