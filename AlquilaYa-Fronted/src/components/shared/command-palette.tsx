'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  ClipboardList,
  FileWarning,
  Heart,
  Home,
  LayoutDashboard,
  Loader2,
  LogIn,
  Mail,
  MessageCircle,
  Moon,
  PlusCircle,
  Search,
  Sun,
  User,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { useAuth } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuthModal } from '@/stores/auth-modal-store';
import { useCommandPaletteStore } from '@/stores/command-palette-store';
import { useThemeStore } from '@/stores/theme-store';
import { usuarioMasterService, type UsuarioMaster } from '@/services/admin-user-service';
import { servicioPropiedades } from '@/services/property-service';
import type { Propiedad } from '@/types/propiedad';

/** Sección del "Directorio usuarios" a la que navega cada rol (no hay ficha por-id). */
const SECCION_POR_ROL: Record<UsuarioMaster['rol'], string> = {
  ESTUDIANTE: '/admin-master/clients/students',
  ARRENDADOR: '/admin-master/clients/providers',
  ADMIN: '/admin-master/clients/staff',
};

interface Accion {
  label: string;
  icon: typeof Home;
  onSelect: () => void;
  atajo?: string;
}

/**
 * Command palette global (Ctrl/⌘+K) — ítem 49 de MEJORAS.md. Las acciones
 * cambian según el rol de la sesión actual.
 */
export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const toggle = useCommandPaletteStore((s) => s.toggle);
  const router = useRouter();
  const { usuario, estaAutenticado } = useAuth();
  const { open: abrirAuthModal } = useAuthModal();
  const { preference, setPreference } = useThemeStore();
  const esAdmin = usuario?.rol === 'ADMIN';

  // Búsqueda global admin (ítem 377): solo se activa para ADMIN y con texto real —
  // el resto de roles conserva el comportamiento original (solo navegación estática).
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query.trim(), 300);
  const [buscando, setBuscando] = useState(false);
  const [usuariosEncontrados, setUsuariosEncontrados] = useState<UsuarioMaster[]>([]);
  const [propiedadesEncontradas, setPropiedadesEncontradas] = useState<Propiedad[]>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggle]);

  // Cierra el diálogo y limpia el estado de búsqueda para no arrastrar resultados viejos la
  // próxima vez que se abra. Vive en el handler (no en un efecto) porque es una respuesta directa
  // a la interacción del usuario, no una sincronización con un sistema externo.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery('');
      setUsuariosEncontrados([]);
      setPropiedadesEncontradas([]);
    }
  };

  useEffect(() => {
    // Query corta o rol no-admin: no hay nada que buscar. Los resultados/estado de carga
    // "viejos" que pudieran quedar en memoria no se muestran igual, porque el render de los
    // grupos "Usuarios"/"Propiedades" ya está condicionado a `mostrarBusquedaAdmin` más abajo.
    if (!esAdmin || debouncedQuery.length < 2) return;

    let cancelado = false;

    // Envuelto en una función async invocada aparte (en vez de estatements sueltos en el cuerpo
    // del efecto) para que las llamadas a setState vivan en un callback, no de forma síncrona
    // directamente en el efecto — patrón recomendado para fetch en efectos.
    const buscar = async () => {
      setBuscando(true);
      try {
        const [u, p] = await Promise.all([
          // Búsqueda de usuarios: server-side (ítem 377), nombre/apellido/DNI/correo — mismo
          // patrón que propiedades abajo.
          usuarioMasterService.buscar(debouncedQuery, 5).catch(() => []),
          // Búsqueda de propiedades: server-side, reusa el buscador público de texto libre
          // (título/descripción/dirección) ya usado en /search — solo cubre avisos APROBADOS.
          servicioPropiedades.buscar({ q: debouncedQuery }).then((r) => r.slice(0, 5)).catch(() => []),
        ]);
        if (cancelado) return;
        setUsuariosEncontrados(u);
        setPropiedadesEncontradas(p);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    };
    void buscar();

    return () => {
      cancelado = true;
    };
  }, [debouncedQuery, esAdmin]);

  const ir = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const navegacion: Accion[] = [
    { label: 'Inicio', icon: Home, onSelect: () => ir('/') },
    { label: 'Explorar cuartos', icon: Search, onSelect: () => ir('/search') },
  ];

  const sesion: Accion[] = !estaAutenticado
    ? [
        { label: 'Iniciar sesión', icon: LogIn, onSelect: () => { setOpen(false); abrirAuthModal('login'); } },
        { label: 'Crear cuenta', icon: UserPlus, onSelect: () => ir('/register') },
      ]
    : usuario?.rol === 'ESTUDIANTE'
      ? [
          { label: 'Mi panel', icon: LayoutDashboard, onSelect: () => ir('/student') },
          { label: 'Mis favoritos', icon: Heart, onSelect: () => ir('/student/favorites') },
          { label: 'Mis reservas', icon: ClipboardList, onSelect: () => ir('/student/reservations') },
          { label: 'Mensajes', icon: MessageCircle, onSelect: () => ir('/student/messages') },
          { label: 'Notificaciones', icon: Bell, onSelect: () => ir('/student/notifications') },
          { label: 'Mi perfil', icon: User, onSelect: () => ir('/student/profile') },
        ]
      : usuario?.rol === 'ARRENDADOR'
        ? [
            { label: 'Mi panel', icon: LayoutDashboard, onSelect: () => ir('/landlord/dashboard') },
            { label: 'Mis propiedades', icon: Building2, onSelect: () => ir('/landlord/properties/active') },
            { label: 'Publicar propiedad', icon: PlusCircle, onSelect: () => ir('/landlord/properties/add') },
            { label: 'Reservas', icon: ClipboardList, onSelect: () => ir('/landlord/reservations/active') },
            { label: 'Mensajes', icon: MessageCircle, onSelect: () => ir('/landlord/messages/students') },
            { label: 'Finanzas', icon: Wallet, onSelect: () => ir('/landlord/finances/monthly') },
          ]
        : usuario?.rol === 'ADMIN'
          ? [
              { label: 'Panel admin', icon: LayoutDashboard, onSelect: () => ir('/admin-master') },
              { label: 'Estudiantes', icon: Users, onSelect: () => ir('/admin-master/clients/students') },
              { label: 'Arrendadores', icon: Users, onSelect: () => ir('/admin-master/clients/providers') },
              { label: 'Propiedades por revisar', icon: Building2, onSelect: () => ir('/admin-master/properties/to-review') },
              { label: 'Denuncias', icon: FileWarning, onSelect: () => ir('/admin-master/reports/listings') },
            ]
          : [];

  const utilidades: Accion[] = [
    {
      label: preference === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
      icon: preference === 'dark' ? Sun : Moon,
      onSelect: () => {
        setOpen(false);
        setPreference(preference === 'dark' ? 'light' : 'dark');
      },
    },
    ...(estaAutenticado
      ? [{ label: 'Contactar soporte', icon: Mail, onSelect: () => { setOpen(false); window.location.href = 'mailto:soporte@alquilaya.pe'; } }]
      : []),
  ];

  // Solo se muestran los grupos dinámicos cuando el admin escribe algo con sentido a buscar.
  const mostrarBusquedaAdmin = esAdmin && debouncedQuery.length >= 2;

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder={esAdmin ? 'Busca una página, usuario o propiedad…' : 'Busca una página o acción…'}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!mostrarBusquedaAdmin && <CommandEmpty>Sin resultados.</CommandEmpty>}

        {mostrarBusquedaAdmin && (
          <>
            <CommandGroup heading="Usuarios">
              {buscando ? (
                // `keywords={[debouncedQuery]}` fuerza el match contra el filtro fuzzy interno
                // de cmdk (que compara el input actual contra value+keywords) — sin esto, este
                // item placeholder podría quedar oculto por no "matchear" su propio texto.
                <CommandItem disabled value="__buscando-usuarios" keywords={[debouncedQuery]}>
                  <Loader2 className="animate-spin" aria-hidden />
                  Buscando usuarios…
                </CommandItem>
              ) : usuariosEncontrados.length === 0 ? (
                <CommandItem disabled value="__sin-usuarios" keywords={[debouncedQuery]}>
                  <Users aria-hidden />
                  Sin usuarios que coincidan con &ldquo;{debouncedQuery}&rdquo;
                </CommandItem>
              ) : (
                usuariosEncontrados.map((u) => (
                  <CommandItem
                    key={`user-${u.id}`}
                    value={`user-${u.id}`}
                    keywords={[u.nombre, u.apellido, u.dni, u.correo].filter(Boolean) as string[]}
                    onSelect={() => ir(SECCION_POR_ROL[u.rol])}
                  >
                    <User aria-hidden />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{u.nombre} {u.apellido}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {u.rol} · {u.correo} · DNI {u.dni}
                      </span>
                    </span>
                  </CommandItem>
                ))
              )}
            </CommandGroup>

            <CommandSeparator />
            <CommandGroup heading="Propiedades">
              {buscando ? (
                <CommandItem disabled value="__buscando-propiedades" keywords={[debouncedQuery]}>
                  <Loader2 className="animate-spin" aria-hidden />
                  Buscando propiedades…
                </CommandItem>
              ) : propiedadesEncontradas.length === 0 ? (
                <CommandItem disabled value="__sin-propiedades" keywords={[debouncedQuery]}>
                  <Building2 aria-hidden />
                  Sin propiedades aprobadas que coincidan con &ldquo;{debouncedQuery}&rdquo;
                </CommandItem>
              ) : (
                propiedadesEncontradas.map((p) => (
                  <CommandItem
                    key={`prop-${p.id}`}
                    value={`prop-${p.id}`}
                    keywords={[p.titulo]}
                    onSelect={() => ir(`/property/${p.id}`)}
                  >
                    <Building2 aria-hidden />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{p.titulo}</span>
                      <span className="truncate text-xs text-muted-foreground">#{p.id}</span>
                    </span>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navegación">
          {navegacion.map((a) => (
            <CommandItem key={a.label} onSelect={a.onSelect}>
              <a.icon aria-hidden />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {sesion.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={estaAutenticado ? 'Tu cuenta' : 'Cuenta'}>
              {sesion.map((a) => (
                <CommandItem key={a.label} onSelect={a.onSelect}>
                  <a.icon aria-hidden />
                  {a.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Preferencias">
          {utilidades.map((a) => (
            <CommandItem key={a.label} onSelect={a.onSelect}>
              <a.icon aria-hidden />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      <div className="flex items-center gap-4 border-t border-border/60 bg-muted/30 px-4 py-2.5 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> Navegar
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> Seleccionar
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Kbd>Esc</Kbd> Cerrar
        </span>
      </div>
    </CommandDialog>
  );
}
