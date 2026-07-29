'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadMessagesStore } from '@/stores/unread-messages-store';
import { cn } from '@/lib/cn';
import { profileService } from '@/services/profile-service';
import { documentsService } from '@/services/documents-service';
import type { Perfil, Documento } from '@/types/profile';

interface NavSubItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  icon: string;
  href?: string;
  badge?: number;
  subItems?: NavSubItem[];
}

interface NavCategory {
  title?: string;
  items: NavItem[];
}

const NAVIGATION: NavCategory[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { label: 'Resumen', icon: 'grid_view', href: '/landlord/dashboard' },
    ],
  },
  {
    title: 'PROPIEDADES',
    items: [
      {
        label: 'Mis cuartos',
        icon: 'home',
        subItems: [
          { label: 'Cuartos activos', href: '/landlord/properties/active' },
          { label: 'Agregar cuarto', href: '/landlord/properties/add' },
          { label: 'Borradores', href: '/landlord/properties/drafts' },
        ],
      },
    ],
  },
  {
    title: 'RESERVAS',
    items: [
      {
        label: 'Reservas',
        icon: 'calendar_month',
        subItems: [
          { label: 'Reservas activas', href: '/landlord/reservations/active' },
          { label: 'Contratos',        href: '/landlord/reservations/contracts' },
          { label: 'Historial',        href: '/landlord/reservations/history' },
        ],
      },
    ],
  },
  {
    title: 'FINANZAS',
    items: [
      {
        label: 'Ingresos',
        icon: 'payments',
        subItems: [
          { label: 'Resumen mensual', href: '/landlord/finances/monthly' },
          { label: 'Por cuarto', href: '/landlord/finances/per-room' },
          { label: 'Mis desembolsos', href: '/landlord/finances/payouts' },
        ],
      },
    ],
  },
  {
    title: 'COMUNICACIÓN',
    items: [
      {
        label: 'Mensajes',
        icon: 'chat',
        subItems: [
          { label: 'Estudiantes', href: '/landlord/messages/students' },
          { label: 'Notificaciones', href: '/landlord/messages/notifications' },
          { label: 'Reseñas de Usuarios', href: '/landlord/messages/reviews' },
        ],
      },
    ],
  },
  {
    title: 'CUENTA',
    items: [
      { label: 'Perfil', icon: 'person', href: '/landlord/profile' },
    ],
  },
];

/** Ítems 305/306: estado real de verificación KYC del arrendador (ver DocumentoService#recalcularVerificacionArrendador). */
type VerificacionEstado = 'verificado' | 'revision' | 'sin_verificar';

/**
 * `Arrendador.verificado` (expuesto en `detallesArrendador.verificado`, ítem 305/306) solo
 * pasa a `true` cuando TODOS los documentos requeridos quedan APROBADOS — es un booleano de
 * "todo o nada", no distingue "nunca subió nada" de "ya subió y está en cola". Para eso se
 * cruza con la lista de documentos: si hay al menos uno PENDIENTE, está "en revisión".
 */
function derivarVerificacion(perfil: Perfil | null, documentos: Documento[]): VerificacionEstado {
  if (perfil?.detallesArrendador?.verificado) return 'verificado';
  return documentos.some((d) => d.estadoVerificacion === 'PENDIENTE') ? 'revision' : 'sin_verificar';
}

const BADGE_LABEL: Record<VerificacionEstado, string> = {
  verificado: 'Socio Verificado',
  revision: 'Verificación en revisión',
  sin_verificar: 'Sin verificar',
};

const BADGE_CLASS: Record<VerificacionEstado, string> = {
  verificado: 'text-success',
  revision: 'text-warning',
  sin_verificar: 'text-sidebar-foreground/50',
};

export default function LandlordSidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { usuario, cerrarSesion } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['PROPIEDADES', 'RESERVAS']);
  const totalNoLeidos = useUnreadMessagesStore((s) => s.total);

  // Ítems 305/306: `useAuth()` no trae el estado de verificación real del arrendador (solo
  // usuario/rol de sesión) — hay que pedirlo aparte. Se usa `.then()` dentro del efecto (no
  // setState síncrono en el cuerpo) para respetar `react-hooks/set-state-in-effect`.
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);

  useEffect(() => {
    let cancelado = false;
    Promise.allSettled([
      profileService.obtenerMiPerfil(),
      documentsService.listarMisDocumentos(),
    ]).then(([perfilResult, docsResult]) => {
      if (cancelado) return;
      if (perfilResult.status === 'fulfilled') setPerfil(perfilResult.value);
      if (docsResult.status === 'fulfilled') setDocumentos(docsResult.value);
      setCargandoPerfil(false);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const estadoVerificacion = derivarVerificacion(perfil, documentos);

  const toggleItem = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? [] : [label]
    );
  };

  const handleLogout = () => {
    cerrarSesion();
    window.location.replace('/');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col z-[60] overflow-y-auto custom-scrollbar',
        'transition-transform duration-300 lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Logo Section */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/15 border border-primary/25 rounded-md flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl">widgets</span>
          </div>
          <div>
            <p className="text-xl font-bold text-sidebar-foreground tracking-tight leading-none">AlquilaYa</p>
            <p className="text-[10px] font-semibold text-primary/50 uppercase tracking-wider mt-1">Provider Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Navegación de arrendador" className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pb-4">
        {NAVIGATION.map((category, idx) => (
          <div key={idx} className="space-y-1">
            <div className="space-y-1">
              {category.items.map((item) => {
                const isExpanded = expandedItems.includes(item.label);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isItemActive = item.href === pathname;
                const isAnySubItemActive = item.subItems?.some(si => pathname === si.href);
                const isActive = isItemActive || isAnySubItemActive;

                const efectivoBadge = item.label === 'Mensajes' && totalNoLeidos > 0
                    ? totalNoLeidos
                    : item.badge;

                return (
                  <div key={item.label} className="space-y-1">
                    {item.href ? (
                      <Link
                        href={item.href}
                        replace
                        onClick={onNavigate}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors duration-150 group",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "material-symbols-outlined text-[20px] opacity-80",
                            isActive ? "text-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                          )}>
                            {item.icon}
                          </span>
                          <span className="text-sm font-bold tracking-tight">{item.label}</span>
                        </div>
                        {efectivoBadge && (
                          <span className={cn(
                            "min-w-[20px] h-5 px-1.5 rounded flex items-center justify-center text-[10px] font-bold",
                            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-red-500 text-white"
                          )}>
                            {efectivoBadge > 99 ? '99+' : efectivoBadge}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <button
                        onClick={() => toggleItem(item.label)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors duration-150 group",
                          isActive && !isExpanded
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : isAnySubItemActive
                              ? "text-primary"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "material-symbols-outlined text-[20px] opacity-80",
                            isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                          )}>
                            {item.icon}
                          </span>
                          <span className="text-sm font-bold tracking-tight">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {efectivoBadge && !isExpanded && (
                            <span className="min-w-[20px] h-5 px-1.5 rounded flex items-center justify-center text-[10px] font-bold bg-red-500 text-white">
                              {efectivoBadge > 99 ? '99+' : efectivoBadge}
                            </span>
                          )}
                          <span className={cn(
                            "material-symbols-outlined text-[18px] transition-transform duration-300",
                            isExpanded ? "rotate-180" : ""
                          )}>
                            expand_more
                          </span>
                        </div>
                      </button>
                    )}

                    {/* Sub Items Accordion */}
                    {hasSubItems && isExpanded && (
                      <div className="ml-9 space-y-1 border-l border-sidebar-border pl-3 py-1">
                        {item.subItems?.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            replace
                            onClick={onNavigate}
                            aria-current={pathname === subItem.href ? 'page' : undefined}
                            className={cn(
                              "block py-1.5 text-xs font-bold transition-all hover:text-sidebar-foreground",
                              pathname === subItem.href
                                ? "text-sidebar-foreground"
                                : "text-sidebar-foreground/45"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span className={cn(
                                "w-1 h-1 rounded-full",
                                pathname === subItem.href ? "bg-primary" : "bg-sidebar-foreground/25"
                              )} />
                              {subItem.label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 bg-sidebar border-t border-sidebar-border">
        <div className="p-3 rounded-md bg-sidebar-accent/70 border border-sidebar-border flex items-center justify-between group hover:border-sidebar-ring/40 transition-colors">
          <Link href="/landlord/verification" className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="w-9 h-9 bg-primary/20 rounded-md flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-bold">
                {usuario?.nombre ? usuario.nombre.substring(0, 2).toUpperCase() : '—'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-sidebar-foreground tracking-tight truncate">{usuario?.nombre ?? ''}</p>
              {cargandoPerfil ? (
                <div className="h-2.5 w-24 rounded-full bg-sidebar-foreground/15 animate-pulse mt-1.5" />
              ) : (
                <p className={cn('text-[10px] font-semibold truncate hover:underline', BADGE_CLASS[estadoVerificacion])}>
                  {BADGE_LABEL[estadoVerificacion]}
                </p>
              )}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="w-11 h-11 rounded-md flex items-center justify-center text-sidebar-foreground/45 hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0 ml-2"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
