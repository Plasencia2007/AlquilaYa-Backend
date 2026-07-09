'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Mail, MessageSquare, GraduationCap, BadgeCheck } from 'lucide-react';
import { ReputationBadge } from '@/components/reputation-badge';
import type { Reserva } from '@/types/reserva';
import { Button } from '@/components/ui/legacy-button';
import { labelOpcion, roommateService, type PerfilConvivencia } from '@/services/roommate-service';

interface StudentProfileModalProps {
  open: boolean;
  reserva: Reserva | null;
  onClose: () => void;
}

export function StudentProfileModal({ open, reserva, onClose }: StudentProfileModalProps) {
  const [convivencia, setConvivencia] = useState<PerfilConvivencia | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Fetch cohabitation profile on open
  useEffect(() => {
    if (!open || !reserva) {
      setConvivencia(null);
      return;
    }
    
    setLoading(true);
    roommateService.convivenciaDe(reserva.estudianteId)
      .then((data) => {
        setConvivencia(data);
      })
      .catch((err) => {
        console.error('Error cargando perfil de convivencia del estudiante:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, reserva]);

  // Safety fallback if no reservation or not mounted
  if (!reserva || !mounted) return null;

  const nombre = reserva.estudianteNombre ?? `Estudiante ${reserva.estudianteId}`;
  const iniciales = nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  // WhatsApp Link generator (Peru code default: +51)
  const formatWhatsAppLink = (phone?: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;
    return `https://wa.me/${phoneWithCountry}?text=Hola%20${encodeURIComponent(nombre)},%20te%20escribo%20desde%20AlquilaYa%20con%20respecto%20a%20tu%20solicitud%20de%20reserva.`;
  };

  const habitos = [
    { key: 'fuma', val: convivencia?.fuma, icon: 'smoking_rooms', label: 'Tabaco' },
    { key: 'horario', val: convivencia?.horario, icon: 'schedule', label: 'Horarios' },
    { key: 'orden', val: convivencia?.orden, icon: 'cleaning_services', label: 'Limpieza' },
    { key: 'ruido', val: convivencia?.ruido, icon: 'volume_up', label: 'Ruido' },
    { key: 'sociabilidad', val: convivencia?.sociabilidad, icon: 'groups', label: 'Visitas/Social' },
    { key: 'mascotas', val: convivencia?.mascotas, icon: 'pets', label: 'Mascotas' },
    { key: 'invitados', val: convivencia?.invitados, icon: 'person_add', label: 'Invitados' },
  ].filter((h) => !!h.val);

  const tienePreferencias = convivencia?.presupuestoMax || (convivencia?.zonasPreferidas && convivencia.zonasPreferidas.length > 0);

  return createPortal(
    <div
      className={`fixed inset-0 z-[110] flex justify-end overflow-hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ${
          open ? 'opacity-100 animate-in fade-in slide-in-from-bottom-2 duration-400' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer Container Panel */}
      <div
        className={`relative w-full max-w-lg bg-card h-full shadow-2xl border-l border-border flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 ease-out z-10 ${
          open ? 'translate-x-0 animate-in fade-in slide-in-from-right duration-300' : 'translate-x-full'
        }`}
      >
        {/* Soft background glows */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 -left-24 w-48 h-48 rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

        {/* Header section */}
        <div className="p-6 sm:p-8 pb-4 border-b border-border/60 relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-250 cursor-pointer"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-center gap-4 mt-2">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary border-2 border-background shadow-md flex items-center justify-center text-xl font-black select-none">
                {iniciales}
              </div>
              {reserva.estudianteVerificado && (
                <span className="absolute bottom-1 right-0 bg-primary text-white rounded-full p-0.5 border border-background shadow-xs flex items-center justify-center">
                  <BadgeCheck className="size-3.5" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-lg font-black text-foreground tracking-tight truncate leading-tight">
                {nombre}
              </h3>
              <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                {reserva.estudianteCarrera || 'Estudiante'} en {reserva.estudianteUniversidad || 'AlquilaYa'}
              </p>

              {reserva.estudianteNivelReputacion && (
                <div className="mt-1 flex">
                  <ReputationBadge
                    nivel={reserva.estudianteNivelReputacion}
                    score={reserva.estudianteScore}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto">
          {loading ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-xs font-bold text-muted-foreground animate-pulse">
                Cargando perfil de convivencia...
              </p>
            </div>
          ) : (
            /* Cohabitation details */
            <>
              {/* Bio & Social */}
              {convivencia?.bio && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">
                    Sobre mí
                  </span>
                  <p className="text-xs text-foreground font-medium bg-muted/40 border border-border/40 rounded-2xl p-4 leading-relaxed whitespace-pre-line select-none">
                    "{convivencia.bio}"
                  </p>
                </div>
              )}

              {/* Instagram link */}
              {convivencia?.instagram && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-pink-500/5 to-purple-500/5 border border-pink-500/10">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-pink-700 leading-none mb-0.5">
                      Instagram
                    </p>
                    <a
                      href={`https://instagram.com/${convivencia.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black text-foreground hover:text-pink-600 transition-colors truncate block"
                    >
                      @{convivencia.instagram.replace('@', '')}
                    </a>
                  </div>
                </div>
              )}

              {/* Academic Info */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">
                  Información Académica y Confianza
                </span>
                <div className="bg-muted/20 border border-border/60 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                      <GraduationCap className="size-4" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-[9px] font-bold text-muted-foreground leading-none mb-0.5">
                        Carrera / Ciclo
                      </p>
                      <p className="text-xs font-black text-foreground truncate leading-tight">
                        {reserva.estudianteCarrera || 'No especificada'}
                        {convivencia?.ciclo ? ` (Ciclo ${convivencia.ciclo})` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">school</span>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-[9px] font-bold text-muted-foreground leading-none mb-0.5">
                        Universidad
                      </p>
                      <p className="text-xs font-black text-foreground truncate leading-tight">
                        {reserva.estudianteUniversidad || 'No especificada'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-[9px] font-bold text-muted-foreground leading-none mb-0.5">
                        Verificación AlquilaYa
                      </p>
                      <p className="text-xs font-black text-foreground leading-tight">
                        {reserva.estudianteVerificado ? (
                          <span className="text-primary flex items-center gap-1">
                            Estudiante Verificado
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Perfil Básico</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Habits grid */}
              {habitos.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">
                    Hábitos y Estilo de Vida
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {habitos.map((h) => (
                      <div key={h.key} className="flex items-center gap-2.5 p-3 rounded-2xl border border-border/80 bg-card/60">
                        <div className="w-7 h-7 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0 select-none">
                          <span className="material-symbols-outlined text-[16px]">
                            {h.icon}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-muted-foreground leading-none mb-0.5">
                            {h.label}
                          </p>
                          <p className="text-xs font-black text-foreground truncate leading-tight">
                            {labelOpcion(h.key as any, h.val)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Match Preferences */}
              {tienePreferencias && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">
                    Preferencias de Roommate
                  </span>
                  <div className="bg-muted/20 border border-border/60 rounded-2xl p-4 space-y-2 text-xs">
                    {convivencia.presupuestoMax && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-bold">Presupuesto máx:</span>
                        <span className="font-black text-foreground">S/ {convivencia.presupuestoMax.toLocaleString('es-PE')}</span>
                      </div>
                    )}
                    {convivencia.zonasPreferidas && convivencia.zonasPreferidas.length > 0 && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-muted-foreground font-bold shrink-0">Zonas preferidas:</span>
                        <span className="font-black text-foreground text-right">{convivencia.zonasPreferidas.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Interests tag list */}
              {convivencia?.intereses && convivencia.intereses.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">
                    Intereses y Hobbies
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {convivencia.intereses.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full text-[10px] font-black bg-primary/5 text-primary border border-primary/10 select-none"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with actions */}
        <div className="p-6 sm:p-8 border-t border-border/60 bg-muted/20 space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block mb-1">
            Contacto del Estudiante
          </span>

          <div className="grid grid-cols-1 gap-2">
            {reserva.estudianteTelefono ? (
              <>
                <Button
                  asChild
                  variant="dark"
                  size="md"
                  className="w-full justify-center bg-foreground text-background hover:bg-foreground/90 font-black rounded-2xl h-11"
                >
                  <a href={`tel:${reserva.estudianteTelefono}`} className="flex items-center gap-2">
                    <Phone className="size-4" />
                    Llamar por Teléfono
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="md"
                  className="w-full justify-center border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 font-black rounded-2xl h-11"
                >
                  <a
                    href={formatWhatsAppLink(reserva.estudianteTelefono)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="size-4" />
                    Enviar mensaje WhatsApp
                  </a>
                </Button>
              </>
            ) : (
              <div className="text-center py-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600 text-xs font-medium">
                Sin teléfono registrado en el perfil.
              </div>
            )}

            {reserva.estudianteCorreo && (
              <Button
                asChild
                variant="ghost"
                size="md"
                className="w-full justify-center text-muted-foreground hover:text-foreground font-black rounded-2xl h-11"
              >
                <a href={`mailto:${reserva.estudianteCorreo}`} className="flex items-center gap-2">
                  <Mail className="size-4" />
                  Enviar Correo Electrónico
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) as any;
}
