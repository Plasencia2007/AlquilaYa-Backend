'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { METRICAS_LATERALES } from '@/mocks/admin';
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
    items: [
      {
        label: 'Panel de Control',
        icon: 'dashboard',
        href: '/admin-master',
      },
      {
        label: 'Análisis global',
        icon: 'grid_view',
        subItems: [
          { label: 'Métricas de red', href: '/admin-master/metrics/network' },
          { label: 'Mapa de calor', href: '/admin-master/metrics/heatmap' },
          { label: 'Monitor del sistema', href: '/admin-master/metrics/system' },
        ],
      },
    ],
  },
  {
    title: 'VALIDACIONES',
    items: [
      {
        label: 'Proveedores',
        icon: 'person_search',
        badge: METRICAS_LATERALES.proveedoresPendientes,
        subItems: [
          { label: 'Pendientes de aprob.', href: '/admin-master/validations/providers/pending' },
          { label: 'Verificados', href: '/admin-master/validations/providers/verified' },
          { label: 'Rechazados', href: '/admin-master/validations/providers/rejected' },
        ],
      },
      {
        label: 'Auditoría inmuebles',
        icon: 'home_work',
        badge: METRICAS_LATERALES.inmueblesPorRevisar,
        subItems: [
          { label: 'Cuartos por revisar', href: '/admin-master/properties/to-review' },
          { label: 'Historial de decisiones', href: '/admin-master/properties/history' },
        ],
      },
    ],
  },
  {
    title: 'COMUNIDAD',
    items: [
      {
        label: 'Directorio usuarios',
        icon: 'group_add',
        subItems: [
          { label: 'Estudiantes', href: '/admin-master/clients/students' },
          { label: 'Proveedores', href: '/admin-master/clients/providers' },
          { label: 'Staff / admins', href: '/admin-master/clients/staff' },
        ],
      },
    ],
  },
  {
    items: [
      {
        label: 'Reportes y denuncias',
        icon: 'report',
        badge: METRICAS_LATERALES.denunciasPendientes,
        subItems: [
          { label: 'Sin gestionar', href: '/admin-master/reports/pending' },
          { label: 'Baneos activos', href: '/admin-master/reports/active-bans' },
        ],
      },
    ],
  },
  {
    title: 'CATÁLOGO Y REGIONES',
    items: [
      {
        label: 'Zonas universitarias',
        icon: 'location_on',
        subItems: [
          { label: 'Crear / editar zonas', href: '/admin-master/catalog/zones/edit' },
          { label: 'Precios de referencia', href: '/admin-master/catalog/zones/prices' },
        ],
      },
      {
        label: 'Etiquetas servicios',
        icon: 'shopping_bag',
        subItems: [
          { label: 'Wi-Fi, lavandería, etc.', href: '/admin-master/catalog/tags' },
        ],
      },
    ],
  },
  {
    title: 'MARKETING',
    items: [
      {
        label: 'Notificaciones masivas',
        icon: 'notifications',
        subItems: [
          { label: 'Enviar a estudiantes', href: '/admin-master/marketing/notifications/students' },
          { label: 'Enviar a proveedores', href: '/admin-master/marketing/notifications/providers' },
        ],
      },
      {
        label: 'Anuncios premium',
        icon: 'grade',
        badge: METRICAS_LATERALES.anunciosPremium,
        subItems: [
          { label: 'Proveedores destacados', href: '/admin-master/marketing/premium' },
        ],
      },
    ],
  },
  {
    title: 'ADMINISTRACIÓN CORE',
    items: [
      {
        label: 'Economía y Pagos',
        icon: 'payments',
        badge: METRICAS_LATERALES.finanzasPendientes,
        subItems: [
          { label: 'Balance general', href: '/admin-master/finance/balance' },
          { label: 'Pagos a proveedores', href: '/admin-master/finance/payouts' },
          { label: 'Facturación', href: '/admin-master/finance/invoices' },
        ],
      },
      {
        label: 'Configuración del Sistema',
        icon: 'settings_suggest',
        badge: METRICAS_LATERALES.alertasSistema,
        subItems: [
          { label: 'Reglas de la plataforma', href: '/admin-master/system/settings' },
          { label: 'Roles y permisos', href: '/admin-master/system/roles' },
          { label: 'Logs de auditoría', href: '/admin-master/system/audit' },
        ],
      },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, cerrarSesion } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Análisis global', 'Proveedores']);

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
      <Link href="/admin-master" className="px-6 py-5 flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="w-10 h-10 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center shadow-lg shadow-primary/5">
          <span className="material-symbols-outlined text-primary text-2xl">home</span>
        </div>
        <div>
          <p className="text-xl font-black text-white tracking-tighter leading-none">AlquilaYa</p>
          <p className="text-[10px] font-bold text-outline uppercase tracking-[0.2em] mt-1 opacity-60">Torre de Control</p>
        </div>
      </Link>



      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pb-4">
        {NAVIGATION.map((category, idx) => (
          <div key={idx} className="space-y-1">
            <div className="space-y-1">
              {category.items.map((item) => {
                const isExpanded = expandedItems.includes(item.label);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isAnySubItemActive = item.subItems?.some(si => pathname === si.href);

                return (
                  <div key={item.label} className="space-y-1">
                    {/* Item directo (sin subItems) */}
                    {!hasSubItems && item.href ? (
                      <Link
                        href={item.href}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                          pathname === item.href
                            ? "bg-primary text-white"
                            : "text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
                        )}
                      >
                        <span className="material-symbols-outlined text-[20px] opacity-80">
                          {item.icon}
                        </span>
                        <span className="text-sm font-bold tracking-tight">{item.label}</span>
                      </Link>
                    ) : (
                    /* Item con acordeón (con subItems) */
                    <button
                      onClick={() => toggleItem(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group",
                        isAnySubItemActive
                          ? "bg-primary text-white"
                          : "text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px] opacity-80">
                          {item.icon}
                        </span>
                        <span className="text-sm font-bold tracking-tight">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                            isAnySubItemActive ? "bg-white/20 text-white" : "bg-red-500/20 text-red-500"
                          )}>
                            {item.badge}
                          </span>
                        )}
                        {hasSubItems && (
                          <span className={cn(
                            "material-symbols-outlined text-[18px] transition-transform duration-300",
                            isExpanded ? "rotate-180" : ""
                          )}>
                            expand_more
                          </span>
                        )}
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
        <div className="p-3 rounded-2xl bg-[#1e293b]/50 border border-[#334155]/50 flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary text-xs font-black">AD</span>
            </div>
            <div>
              <p className="text-xs font-black text-white tracking-tight">{usuario?.nombre || 'Admin Master'}</p>
              <p className="text-[10px] text-[#64748b] font-bold">God view activo</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748b] hover:bg-red-500/10 hover:text-red-500 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
