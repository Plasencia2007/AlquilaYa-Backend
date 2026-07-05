'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePermisos } from '@/hooks/use-permisos';
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
  /** Si está, solo se muestra a usuarios con este permiso (RBAC dinámico #32). */
  permiso?: string;
}

interface NavCategory {
  title?: string;
  items: NavItem[];
}

// Navegación reorganizada: agrupa por función y alcanza TODAS las páginas reales
// (sin links muertos ni badges mock). Cada href corresponde a una page.tsx existente.
const NAVIGATION: NavCategory[] = [
  {
    items: [
      { label: 'Panel de Control', icon: 'dashboard', href: '/admin-master' },
      {
        label: 'Métricas',
        icon: 'monitoring',
        subItems: [
          { label: 'Resumen', href: '/admin-master/metrics' },
          { label: 'Mapa de calor', href: '/admin-master/metrics/heatmap' },
          { label: 'Red de actividad', href: '/admin-master/metrics/network' },
          { label: 'Sistema', href: '/admin-master/metrics/system' },
        ],
      },
    ],
  },
  {
    title: 'MODERACIÓN',
    items: [
      {
        label: 'Auditoría inmuebles',
        icon: 'home_work',
        subItems: [
          { label: 'Cuartos por revisar', href: '/admin-master/properties/to-review' },
          { label: 'Historial de decisiones', href: '/admin-master/properties/history' },
        ],
      },
      { label: 'Validación proveedores', icon: 'person_search', href: '/admin-master/validations/providers' },
      { label: 'Reseñas', icon: 'reviews', href: '/admin-master/reviews' },
      { label: 'Mensajería', icon: 'forum', href: '/admin-master/moderation' },
      {
        label: 'Reportes y denuncias',
        icon: 'report',
        subItems: [
          { label: 'Denuncias de avisos', href: '/admin-master/reports/listings' },
          { label: 'Sin gestionar', href: '/admin-master/reports/pending' },
          { label: 'Baneos activos', href: '/admin-master/reports/active-bans' },
        ],
      },
    ],
  },
  {
    title: 'COMUNIDAD',
    items: [
      {
        label: 'Directorio usuarios',
        icon: 'group',
        subItems: [
          { label: 'Estudiantes', href: '/admin-master/clients/students' },
          { label: 'Arrendadores', href: '/admin-master/clients/providers' },
          { label: 'Staff / admins', href: '/admin-master/clients/staff' },
          { label: 'Cuentas duplicadas', href: '/admin-master/clients/duplicates' },
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
      { label: 'Etiquetas de servicios', icon: 'sell', href: '/admin-master/catalog/tags' },
      { label: 'Carreras', icon: 'school', href: '/admin-master/catalog/carreras' },
    ],
  },
  {
    title: 'MARKETING',
    items: [
      { label: 'Notificaciones', icon: 'campaign', href: '/admin-master/marketing/notifications/students' },
      { label: 'Anuncios premium', icon: 'grade', href: '/admin-master/marketing/premium' },
    ],
  },
  {
    title: 'ADMINISTRACIÓN',
    items: [
      {
        label: 'Economía y pagos',
        icon: 'payments',
        permiso: 'GESTIONAR_SISTEMA',
        subItems: [
          { label: 'Balance general', href: '/admin-master/finance/balance' },
          { label: 'Pagos a proveedores', href: '/admin-master/finance/payouts' },
          { label: 'Facturación', href: '/admin-master/finance/invoices' },
        ],
      },
      {
        label: 'Configuración',
        icon: 'settings',
        permiso: 'GESTIONAR_SISTEMA',
        subItems: [
          { label: 'Reglas de la plataforma', href: '/admin-master/system/settings' },
          { label: 'Roles y permisos', href: '/admin-master/system/roles' },
          { label: 'Logs de auditoría', href: '/admin-master/system/audit' },
        ],
      },
      { label: 'Alertas del sistema', icon: 'warning', href: '/admin-master/alerts' },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, cerrarSesion } = useAuth();
  const { tienePermiso } = usePermisos();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // RBAC dinámico (#32): un item con `permiso` solo se ve si el usuario lo tiene.
  // ADMIN base ve todo (red de seguridad si /permisos/mios fallara).
  const esAdmin = usuario?.rol === 'ADMIN';
  const puedeVer = (item: NavItem) => !item.permiso || esAdmin || tienePermiso(item.permiso);

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
    <aside className="fixed left-0 top-0 h-screen w-[248px] bg-[#0b0f19] border-r border-white/5 flex flex-col z-[60] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 flex items-center gap-3 border-b border-white/5 bg-black/10">
        <div className="w-11 h-11 bg-gradient-to-br from-[#8f0304]/20 to-[#c14b4c]/10 border border-[#8f0304]/30 rounded-xl flex items-center justify-center shadow-inner shrink-0">
          <span className="material-symbols-outlined text-[#c14b4c] text-2xl">admin_panel_settings</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-white tracking-tight leading-none truncate">
            AlquilaYa <span className="text-[#c14b4c]">Master</span>
          </p>
          <p className="text-[9px] font-black text-[#94a3b8] uppercase tracking-[0.25em] mt-2 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c14b4c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#c14b4c]"></span>
            </span>
            Torre de Control
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar py-4 space-y-4">
        {NAVIGATION.map((category, idx) => (
          <div key={idx} className={cn(idx > 0 && category.items.some(puedeVer) && 'mt-4')}>
            {category.title && category.items.some(puedeVer) && (
              <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#475569] leading-none">
                {category.title}
              </p>
            )}
            <div className="space-y-0.5">
              {category.items.filter(puedeVer).map((item) => {
                const isExpanded = expandedItems.includes(item.label);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isAnySubItemActive = item.subItems?.some(si => pathname === si.href);

                return (
                  <div key={item.label} className="space-y-0.5">
                    {/* Item directo (sin subItems) */}
                    {!hasSubItems && item.href ? (
                      <Link
                        href={item.href}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border-l-[3px] text-sm",
                          pathname === item.href
                            ? "bg-white/5 text-white border-l-[#c14b4c] font-bold shadow-sm"
                            : "text-[#94a3b8] hover:bg-white/5 hover:text-white border-l-transparent hover:pl-4"
                        )}
                      >
                        <span className={cn(
                          "material-symbols-outlined text-[20px] transition-colors duration-200",
                          pathname === item.href ? "text-[#c14b4c]" : "opacity-70"
                        )}>
                          {item.icon}
                        </span>
                        <span className="tracking-tight">{item.label}</span>
                      </Link>
                    ) : (
                      /* Item con acordeón (con subItems) */
                      <button
                        onClick={() => toggleItem(item.label)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 border-l-[3px] text-sm group",
                          isAnySubItemActive
                            ? "bg-white/5 text-white border-l-[#c14b4c] font-bold"
                            : "text-[#94a3b8] hover:bg-white/5 hover:text-white border-l-transparent hover:pl-4"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "material-symbols-outlined text-[20px] transition-colors duration-200",
                            isAnySubItemActive ? "text-[#c14b4c]" : "opacity-70"
                          )}>
                            {item.icon}
                          </span>
                          <span className="tracking-tight">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <span className={cn(
                              "min-w-[18px] h-4.5 px-1 rounded flex items-center justify-center text-[9px] font-black",
                              isAnySubItemActive ? "bg-[#c14b4c]/20 text-white" : "bg-red-500/10 text-red-400"
                            )}>
                              {item.badge}
                            </span>
                          )}
                          {hasSubItems && (
                            <span className={cn(
                              "material-symbols-outlined text-[16px] transition-transform duration-300 text-slate-500 group-hover:text-slate-300",
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
                      <div className="mt-0.5 mb-1 pl-1 flex flex-col gap-0.5">
                        {item.subItems?.map((subItem) => {
                          const subActive = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              replace
                              className={cn(
                                "block rounded-lg pl-10 pr-3 py-2 text-[12.5px] font-medium transition-all duration-200 relative",
                                subActive
                                  ? "text-white bg-[#c14b4c]/10 font-bold before:absolute before:left-5 before:top-[15px] before:w-1.5 before:h-1.5 before:bg-[#c14b4c] before:rounded-full before:shadow-[0_0_8px_#c14b4c]"
                                  : "text-slate-400 hover:text-white hover:bg-white/5 hover:pl-11"
                              )}
                            >
                              {subItem.label}
                            </Link>
                          );
                        })}
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
      <div className="p-4 bg-black/20 border-t border-white/5">
        <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between group hover:bg-slate-900/80 hover:border-white/10 transition-all duration-300 shadow-lg">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-gradient-to-br from-[#8f0304] to-[#c14b4c] rounded-lg flex items-center justify-center shrink-0 shadow-md">
              <span className="text-white text-xs font-black tracking-wider">
                {usuario?.nombre?.substring(0, 2).toUpperCase() || 'JD'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white tracking-tight truncate">
                {usuario?.nombre || 'Jhon'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                <p className="text-[9px] text-[#c14b4c] font-black uppercase tracking-wider">God View</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200 shrink-0 ml-2"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
