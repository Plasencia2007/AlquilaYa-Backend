'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadMessagesStore } from '@/stores/unread-messages-store';
import { cn } from '@/lib/cn';

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

export default function LandlordSidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, cerrarSesion } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['PROPIEDADES', 'RESERVAS']);
  const totalNoLeidos = useUnreadMessagesStore((s) => s.total);

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
        'fixed left-0 top-0 h-screen w-[280px] bg-[#0b1222] border-r border-[#1e293b] flex flex-col z-[60] overflow-y-auto custom-scrollbar',
        'transition-transform duration-300 lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Logo Section */}
      <div className="px-6 py-5 border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/15 border border-primary/25 rounded-md flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl">widgets</span>
          </div>
          <div>
            <p className="text-xl font-bold text-white tracking-tight leading-none">AlquilaYa</p>
            <p className="text-[10px] font-semibold text-primary/50 uppercase tracking-wider mt-1">Provider Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pb-4">
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
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors duration-150 group",
                          isActive
                            ? "bg-primary text-white"
                            : "text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "material-symbols-outlined text-[20px] opacity-80",
                            isActive ? "text-white" : "text-[#94a3b8] group-hover:text-white"
                          )}>
                            {item.icon}
                          </span>
                          <span className="text-sm font-bold tracking-tight">{item.label}</span>
                        </div>
                        {efectivoBadge && (
                          <span className={cn(
                            "min-w-[20px] h-5 px-1.5 rounded flex items-center justify-center text-[10px] font-bold",
                            isActive ? "bg-white/20 text-white" : "bg-red-500 text-white"
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
                              : "text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "material-symbols-outlined text-[20px] opacity-80",
                            isActive ? "text-primary" : "text-[#94a3b8] group-hover:text-white"
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
                      <div className="ml-9 space-y-1 border-l border-[#1e293b] pl-3 py-1">
                        {item.subItems?.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            replace
                            onClick={onNavigate}
                            className={cn(
                              "block py-1.5 text-xs font-bold transition-all hover:text-white",
                              pathname === subItem.href
                                ? "text-white"
                                : "text-[#64748b]"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span className={cn(
                                "w-1 h-1 rounded-full",
                                pathname === subItem.href ? "bg-primary" : "bg-[#334155]"
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
      <div className="p-3 bg-[#0f172a] border-t border-[#1e293b]">
        <div className="p-3 rounded-md bg-[#1e293b]/50 border border-[#334155]/50 flex items-center justify-between group hover:border-[#334155] transition-colors">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-primary/20 rounded-md flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-bold">
                {usuario?.nombre?.substring(0, 2).toUpperCase() || 'CA'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white tracking-tight truncate">{usuario?.nombre || 'Socio AlquilaYa'}</p>
              <p className="text-[10px] text-primary/50 font-semibold truncate">Socio Verificado</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#64748b] hover:bg-red-500/10 hover:text-red-500 transition-colors shrink-0 ml-2"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
