'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GraduationCap, Heart, Lock, Mail, ShieldCheck, Star, User, Users } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerificationPanel from '@/components/auth/verification-panel';
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner';
import { useAuth } from '@/hooks/use-auth';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useVerificationStatus } from '@/hooks/use-verification-status';

import { AcademicTab }    from './academic-tab';
import { PersonalTab }    from './personal-tab';
import { SecurityTab }    from './security-tab';
import { ConvivenciaTab } from './convivencia-tab';

const TABS = [
  { value: 'personal',     label: 'Personal',      icon: User        },
  { value: 'academico',    label: 'Académico',     icon: GraduationCap },
  { value: 'convivencia',  label: 'Convivencia',   icon: Users       },
  { value: 'seguridad',    label: 'Seguridad',     icon: Lock        },
  { value: 'verificacion', label: 'Verificación',  icon: ShieldCheck },
] as const;

/* ── Hero de perfil ── */
function ProfileHero() {
  const { usuario } = useAuth();
  const { verificado } = useVerificationStatus();
  const totalFavoritos = useFavoritesStore((s) => s.ids.size);

  const inicial = usuario?.nombre.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {/* Gradiente decorativo de fondo */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/8 via-transparent to-transparent" />

      {/* Franja de color izquierda */}
      <div className="absolute left-0 top-0 h-full w-1.5 bg-primary" />

      {/* Contenido en una sola fila */}
      <div className="relative flex items-center gap-5 px-8 py-5">
        {/* Avatar */}
        {usuario?.avatar ? (
          <img
            src={usuario.avatar}
            alt={usuario?.nombre ?? 'Avatar'}
            referrerPolicy="no-referrer"
            className="size-14 shrink-0 rounded-full object-cover shadow-md ring-2 ring-primary/20"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-black text-primary-foreground shadow-md ring-2 ring-primary/20">
            {inicial}
          </span>
        )}

        {/* Nombre + correo + badge */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold tracking-tight text-foreground">{usuario?.nombre}</h2>
            {verificado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                <ShieldCheck className="size-3" /> Verificado
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{usuario?.correo}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="flex shrink-0 items-center divide-x divide-border">
          <div className="px-5 text-center">
            <p className="text-xl font-black leading-none text-foreground">{totalFavoritos}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Favoritos</p>
          </div>
          <div className="px-5 text-center">
            <Star className="mx-auto size-5 fill-amber-400 text-amber-400" />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reputación</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tabs ── */
function ProfileTabs() {
  const searchParams = useSearchParams();
  const initial = searchParams?.get('tab') ?? 'personal';
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    const next = searchParams?.get('tab');
    if (next && next !== tab) setTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Tabs value={tab} onValueChange={setTab}>
      {/* Tab bar underline */}
      <div className="mb-6 border-b border-border">
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-semibold text-muted-foreground transition-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <TabsContent value="personal">     <PersonalTab />    </TabsContent>
      <TabsContent value="academico">    <AcademicTab />    </TabsContent>
      <TabsContent value="convivencia">  <ConvivenciaTab /> </TabsContent>
      <TabsContent value="seguridad">    <SecurityTab />    </TabsContent>
      <TabsContent value="verificacion"> <VerificationPanel /> </TabsContent>
    </Tabs>
  );
}

export default function StudentProfilePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">

      <div className="mb-6 empty:hidden">
        <EmailVerificationBanner />
      </div>

      <ProfileHero />

      <Suspense fallback={<div className="h-12 animate-pulse rounded-2xl bg-muted" />}>
        <ProfileTabs />
      </Suspense>
    </div>
  );
}
