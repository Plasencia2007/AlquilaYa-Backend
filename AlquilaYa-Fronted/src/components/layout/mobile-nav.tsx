'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Menu, MessageCircle, Heart, History, User, type LucideIcon } from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/search', label: 'Explorar' },
];

const studentLinks: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/student/messages', icon: MessageCircle, label: 'Mis contactos' },
  { href: '/student/favorites', icon: Heart, label: 'Favoritos' },
  { href: '/student/alerts', icon: History, label: 'Búsquedas y alertas' },
  { href: '/student/history', icon: History, label: 'Historial' },
  { href: '/student/profile', icon: User, label: 'Mi cuenta' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { usuario, estaAutenticado, cerrarSesion } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const router = useRouter();

  const handleAuth = (view: 'login' | 'register', role?: 'ESTUDIANTE' | 'ARRENDADOR') => {
    openAuthModal(view, role);
    setOpen(false);
  };

  const goTo = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full max-w-full overflow-y-auto bg-background p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle className="text-xl font-black tracking-tighter">
            <span className="text-primary">Alquila</span>
            <span className="text-foreground">Ya</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-8 px-6 py-6">
          {!estaAutenticado && (
            <>
              <section className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Ingresa y accede a los avisos que contactaste, tus favoritos y las búsquedas guardadas.
                </p>
                <Button
                  size="lg"
                  className="w-full text-xs font-black tracking-widest"
                  onClick={() => handleAuth('login')}
                >
                  INGRESAR
                </Button>
              </section>

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">¿Nuevo en AlquilaYa?</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 w-full rounded-xl border-2 border-primary text-xs font-black tracking-wide text-primary hover:bg-primary/5"
                    onClick={() => handleAuth('register', 'ESTUDIANTE')}
                  >
                    Soy estudiante
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 w-full rounded-xl border-2 border-secondary text-xs font-black tracking-wide text-secondary hover:bg-secondary/5"
                    onClick={() => handleAuth('register', 'ARRENDADOR')}
                  >
                    Soy arrendador
                  </Button>
                </div>
              </section>
            </>
          )}

          {estaAutenticado && usuario && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-4 rounded-2xl bg-muted p-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-black text-primary-foreground">
                  {usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-foreground">{usuario.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{usuario.correo}</p>
                </div>
              </div>

              {usuario.rol === 'ARRENDADOR' ? (
                <Link
                  href="/landlord/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-3 text-base font-bold text-foreground transition-colors hover:text-primary"
                >
                  <LayoutDashboard className="size-5 text-muted-foreground" />
                  Panel de control
                </Link>
              ) : (
                <nav className="flex flex-col">
                  {studentLinks.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => goTo(item.href)}
                      className="group flex items-center gap-4 border-b border-border py-3.5 text-base font-bold text-foreground transition-colors hover:text-primary"
                    >
                      <item.icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
                      {item.label}
                    </button>
                  ))}
                </nav>
              )}

              <Button
                variant="ghost"
                className="justify-start gap-3 px-0 text-base font-bold text-primary hover:bg-transparent hover:text-primary/80"
                onClick={() => {
                  cerrarSesion();
                  setOpen(false);
                }}
              >
                <LogOut className="size-5" />
                Cerrar sesión
              </Button>
            </section>
          )}

          <Separator />

          <nav className="flex flex-col gap-4 pb-10">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-lg font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
