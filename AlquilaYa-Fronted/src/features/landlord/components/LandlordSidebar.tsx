'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/utils/cn';

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
        badge: 4,
        subItems: [
          { label: 'Cuartos activos', href: '/landlord/properties/active' },
          { label: 'Agregar cuarto', href: '/landlord/properties/add' },
          { label: 'Editar / pausar', href: '/landlord/properties/edit' },
        ],
      },
      {
        label: 'Fotos y detalles',
        icon: 'image',
        subItems: [
          { label: 'Galería por cuarto', href: '/landlord/details/gallery' },
          { label: 'Servicios incluidos', href: '/landlord/details/services' },
          { label: 'Reglas de la casa', href: '/landlord/details/rules' },
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
        badge: 2,
        subItems: [
          { label: 'Pendientes', href: '/landlord/reservations/pending' },
          { label: 'Confirmadas', href: '/landlord/reservations/confirmed' },
          { label: 'Historial', href: '/landlord/reservations/history' },
          { label: 'Contratos', href: '/landlord/reservations/contracts' },
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
        badge: 3,
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
      {
        label: 'Perfil',
        icon: 'person',
        subItems: [
          { label: 'Datos personales', href: '/landlord/profile/personal' },
          { label: 'Documentos / DNI', href: '/landlord/profile/docs' },
          { label: 'Contraseña', href: '/landlord/profile/security' },
        ],
      },
    ],
  },
];

export default function LandlordSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, cerrarSesion } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['PROPIEDADES', 'RESERVAS']);

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
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-[#0b1222] border-r border-[#1e293b] flex flex-col z-[60] overflow-hidden">
      {/* Logo Section */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/5">
            <span className="material-symbols-outlined text-blue-400 text-2xl">widgets</span>
          </div>
          <div>
            <p className="text-xl font-black text-white tracking-tighter leading-none">AlquilaYa</p>
            <p className="text-[10px] font-bold text-blue-400/50 uppercase tracking-[0.2em] mt-1">Provider Panel</p>
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

                return (
                  <div key={item.label} className="space-y-1">
                    {item.href ? (
                      <Link
                        href={item.href}
                        replace
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group",
                          isActive
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
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
                        {item.badge && (
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                            isActive ? "bg-white/20 text-white" : "bg-blue-500/20 text-blue-500"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <button
                        onClick={() => toggleItem(item.label)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group",
                          isActive && !isExpanded
                            ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                            : isAnySubItemActive
                              ? "text-blue-400"
                              : "text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "material-symbols-outlined text-[20px] opacity-80",
                            isActive ? "text-blue-400" : "text-[#94a3b8] group-hover:text-white"
                          )}>
                            {item.icon}
                          </span>
                          <span className="text-sm font-bold tracking-tight">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.badge && !isExpanded && (
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-blue-500/20 text-blue-500">
                              {item.badge}
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
                                pathname === subItem.href ? "bg-blue-500" : "bg-[#334155]"
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
        <div className="p-3 rounded-2xl bg-[#1e293b]/50 border border-[#334155]/50 flex items-center justify-between group">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-blue-400 text-xs font-black">
                {usuario?.nombre?.substring(0, 2).toUpperCase() || 'CA'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-white tracking-tight truncate">{usuario?.nombre || 'Socio AlquilaYa'}</p>
              <p className="text-[10px] text-blue-400/50 font-bold truncate">Socio Verificado</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748b] hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0 ml-2"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
