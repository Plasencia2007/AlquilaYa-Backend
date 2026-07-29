'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePermisos } from '@/hooks/use-permisos';
import { rbacService } from '@/services/rbac-service';
import { cn } from '@/lib/cn';

interface NavSubItem {
  label: string;
  href: string;
  /** Si está, solo se muestra a usuarios con este permiso (RBAC dinámico #32). */
  permiso?: string;
  /**
   * Sub-item cuyo backend exige `hasRole('ADMIN')` ESTRICTO (ver `soloAdmin` en
   * NavItem). Permite auth mixta dentro de un mismo grupo (p.ej. "Configuración").
   */
  soloAdmin?: boolean;
}

interface NavItem {
  label: string;
  icon: string;
  href?: string;
  badge?: number;
  subItems?: NavSubItem[];
  /** Si está, solo se muestra a usuarios con este permiso (RBAC dinámico #32). */
  permiso?: string;
  /**
   * Entradas cuyo backend exige `hasRole('ADMIN')` ESTRICTO (no un permiso
   * granular). Solo las ve el ADMIN base; un rol personalizado —aunque tenga
   * permisos— NO las ve, para no mostrar un link que devolvería 403.
   */
  soloAdmin?: boolean;
}

interface NavCategory {
  title?: string;
  items: NavItem[];
}

// Navegación: solo páginas REALES y funcionales. Se quitaron los shells "en construcción"
// (metrics/heatmap|network|system, properties/history, reports/pending|active-bans,
// catalog/zones/prices, marketing/*, finance/invoices, system/audit) para que el menú no
// lleve a páginas vacías. Los archivos siguen existiendo; solo salen del menú. `finance/payouts`
// volvió al menú (ítem 368, ya no es placeholder); `finance/deposits` y `finance/tools` son
// nuevas (ítems 369-371).
const NAVIGATION: NavCategory[] = [
  {
    items: [
      { label: 'Panel de Control', icon: 'dashboard', href: '/admin-master' },
      { label: 'Métricas', icon: 'monitoring', href: '/admin-master/metrics' },
    ],
  },
  {
    title: 'MODERACIÓN',
    items: [
      { label: 'Auditoría inmuebles', icon: 'home_work', href: '/admin-master/properties/to-review' },
      { label: 'Validación proveedores', icon: 'person_search', href: '/admin-master/validations/providers' },
      { label: 'Reseñas', icon: 'reviews', href: '/admin-master/reviews' },
      { label: 'Mensajería', icon: 'forum', href: '/admin-master/moderation' },
      { label: 'Reportes y denuncias', icon: 'report', href: '/admin-master/reports/listings' },
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
      { label: 'Zonas universitarias', icon: 'location_on', href: '/admin-master/catalog/zones/edit' },
      { label: 'Etiquetas de servicios', icon: 'sell', href: '/admin-master/catalog/tags' },
      { label: 'Carreras', icon: 'school', href: '/admin-master/catalog/carreras' },
    ],
  },
  {
    title: 'ADMINISTRACIÓN',
    items: [
      // Economía y pagos: TODO bajo /api/v1/pagos/admin/** (y el reconciliar de G5) exige
      // ADMIN estricto — hasRole("ADMIN") (SecurityConfig) + @PreAuthorize("hasRole('ADMIN')")
      // en cada endpoint. Un rol con GESTIONAR_SISTEMA daría 403 en cualquiera de estos 4.
      {
        label: 'Economía y pagos',
        icon: 'payments',
        soloAdmin: true,
        subItems: [
          { label: 'Balance general', href: '/admin-master/finance/balance' },
          { label: 'Payouts a arrendadores', href: '/admin-master/finance/payouts' },
          { label: 'Depósitos de garantía', href: '/admin-master/finance/deposits' },
          { label: 'Herramientas', href: '/admin-master/finance/tools' },
        ],
      },
      {
        // Auth MIXTA por sub-item:
        // • "Reglas de la plataforma" → su función principal (config de reserva en
        //   servicio-propiedades) es GRANULAR: `/api/v1/admin/propiedades/**` solo
        //   pide .authenticated() y el método usa @permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA').
        // • "Roles y permisos" → ADMIN estricto: en servicio-usuarios la URL
        //   `/api/v1/usuarios/permisos/**` y el catch-all `/api/v1/usuarios/**`
        //   (incluye /rbac) exigen hasRole("ADMIN"), por encima del @PreAuthorize.
        // • "Auditoría" (ítem 365, ya no es placeholder) → mismo catch-all ADMIN estricto
        //   que "Roles y permisos" (`/api/v1/usuarios/audit` cae bajo `/api/v1/usuarios/**`).
        label: 'Configuración',
        icon: 'settings',
        subItems: [
          { label: 'Reglas de la plataforma', href: '/admin-master/system/settings', permiso: 'GESTIONAR_SISTEMA' },
          { label: 'Roles y permisos', href: '/admin-master/system/roles', soloAdmin: true },
          { label: 'Auditoría', href: '/admin-master/system/audit', soloAdmin: true },
        ],
      },
      { label: 'Alertas del sistema', icon: 'warning', href: '/admin-master/alerts' },
      { label: 'Alertas de correo fallidas', icon: 'report_gmailerrorred', soloAdmin: true, href: '/admin-master/system/alertas-fallidas' },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, cerrarSesion } = useAuth();
  const { tienePermiso } = usePermisos();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Ítem 374: rol mostrado en el pie del sidebar. Arranca en "Super Admin" (fallback
  // correcto para un ADMIN "puro" sin roles personalizados) y se corrige si el usuario
  // tiene un rol RBAC custom asignado (ver rbacService.rolesDeUsuario).
  const [rolLabel, setRolLabel] = useState('Super Admin');

  useEffect(() => {
    if (!usuario?.id) return;
    let cancelado = false;
    rbacService
      .rolesDeUsuario(usuario.id)
      .then((roles) => {
        if (cancelado) return;
        setRolLabel(roles[0]?.nombre || 'Super Admin');
      })
      .catch(() => {
        if (!cancelado) setRolLabel('Super Admin');
      });
    return () => {
      cancelado = true;
    };
  }, [usuario?.id]);

  // RBAC dinámico (#32): un item con `permiso` solo se ve si el usuario lo tiene.
  // ADMIN base ve todo (red de seguridad si /permisos/mios fallara).
  const esAdmin = usuario?.rol === 'ADMIN';

  // Regla base de visibilidad según los flags de auth de un item o sub-item:
  // - `soloAdmin`: el backend exige hasRole('ADMIN') ESTRICTO, así que ni siquiera
  //   un permiso granular basta; solo el ADMIN base debe ver el link.
  // - `permiso`: basta con tener ese permiso efectivo (o ser ADMIN).
  const cumpleAuth = (flags: { permiso?: string; soloAdmin?: boolean }) => {
    if (flags.soloAdmin) return esAdmin;
    return !flags.permiso || esAdmin || tienePermiso(flags.permiso);
  };

  const puedeVer = (item: NavItem): boolean => {
    // Grupo con sub-items: el auth puede vivir en cada sub-item (auth mixta).
    // Se muestra si el grupo cumple su propio flag (si lo tuviera) y al menos
    // un sub-item es visible. Así no queda un grupo vacío ni un link roto.
    if (item.subItems && item.subItems.length > 0) {
      if (!cumpleAuth(item)) return false;
      return item.subItems.some(cumpleAuth);
    }
    return cumpleAuth(item);
  };

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
    <aside className="fixed left-0 top-0 h-screen w-[248px] bg-sidebar border-r border-sidebar-border flex flex-col z-[60] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 flex items-center gap-3 border-b border-sidebar-border bg-sidebar-accent/30">
        <div className="w-11 h-11 bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 rounded-xl flex items-center justify-center shadow-inner shrink-0">
          <span className="material-symbols-outlined text-primary text-2xl">admin_panel_settings</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-sidebar-foreground tracking-tight leading-none truncate">
            AlquilaYa <span className="text-primary">Master</span>
          </p>
          <p className="text-[9px] font-black text-sidebar-foreground/60 uppercase tracking-[0.25em] mt-2 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
            </span>
            Torre de Control
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Navegación de administrador" className="flex-1 px-3 overflow-y-auto custom-scrollbar py-4 space-y-4">
        {NAVIGATION.map((category, idx) => (
          <div key={idx} className={cn(idx > 0 && category.items.some(puedeVer) && 'mt-4')}>
            {category.title && category.items.some(puedeVer) && (
              <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-sidebar-foreground/40 leading-none">
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
                        aria-current={pathname === item.href ? 'page' : undefined}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border-l-[3px] text-sm",
                          pathname === item.href
                            ? "bg-sidebar-accent text-sidebar-foreground border-l-primary font-bold shadow-sm"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-transparent hover:pl-4"
                        )}
                      >
                        <span className={cn(
                          "material-symbols-outlined text-[20px] transition-colors duration-200",
                          pathname === item.href ? "text-primary" : "opacity-70"
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
                            ? "bg-sidebar-accent text-sidebar-foreground border-l-primary font-bold"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-transparent hover:pl-4"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "material-symbols-outlined text-[20px] transition-colors duration-200",
                            isAnySubItemActive ? "text-primary" : "opacity-70"
                          )}>
                            {item.icon}
                          </span>
                          <span className="tracking-tight">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <span className={cn(
                              "min-w-[18px] h-4.5 px-1 rounded flex items-center justify-center text-[9px] font-black",
                              isAnySubItemActive ? "bg-primary/20 text-sidebar-foreground" : "bg-red-500/10 text-red-400"
                            )}>
                              {item.badge}
                            </span>
                          )}
                          {hasSubItems && (
                            <span className={cn(
                              "material-symbols-outlined text-[16px] transition-transform duration-300 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
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
                        {item.subItems?.filter(cumpleAuth).map((subItem) => {
                          const subActive = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              replace
                              aria-current={subActive ? 'page' : undefined}
                              className={cn(
                                "block rounded-lg pl-10 pr-3 py-2 text-[12.5px] font-medium transition-all duration-200 relative",
                                subActive
                                  ? "text-sidebar-foreground bg-primary/10 font-bold before:absolute before:left-5 before:top-[15px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full before:shadow-[0_0_8px_var(--primary)]"
                                  : "text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:pl-11"
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
      <div className="p-4 bg-sidebar-accent/20 border-t border-sidebar-border">
        <div className="p-3 rounded-xl bg-sidebar-accent/70 border border-sidebar-border flex items-center justify-between group hover:border-sidebar-ring/40 transition-all duration-300 shadow-lg">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-md">
              <span className="text-primary-foreground text-xs font-black tracking-wider">
                {usuario?.nombre ? usuario.nombre.substring(0, 2).toUpperCase() : '—'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-sidebar-foreground tracking-tight truncate">
                {usuario?.nombre ?? ''}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                <p className="text-[9px] text-primary font-black uppercase tracking-wider truncate">{rolLabel}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-11 h-11 rounded-lg flex items-center justify-center text-sidebar-foreground/45 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 shrink-0 ml-2"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
