'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, Lock, Mail, ShieldCheck, Star, User, Users } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ReputationBadge } from '@/components/shared/reputation-badge';
import VerificationPanel from '@/components/auth/verification-panel';
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner';
import { useAuth } from '@/hooks/use-auth';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { useTabParam } from '@/hooks/use-tab-param';
import { studentProfileService, type EstudianteInfo } from '@/services/student-profile-service';
import { roommateService, type PerfilConvivencia } from '@/services/roommate-service';

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

export const TAB_VALUES = TABS.map((t) => t.value);
export type TabValue = (typeof TAB_VALUES)[number];

interface CompletitudPendiente {
  label: string;
  tab: TabValue;
}

/**
 * Score 0-100 de completitud GLOBAL del perfil (ítem 228): combina datos
 * personales, académicos, convivencia y verificación. Ponderación aproximada
 * (no hace falta una fórmula exacta): personal 20, académico 20, convivencia
 * 30, verificación 30 — se pesa más fuerte lo que más confianza genera para
 * roommates/arrendadores (convivencia + verificación).
 */
function calcularCompletitudGlobal(params: {
  info: EstudianteInfo | null;
  perfilConvivencia: PerfilConvivencia | null;
  verificado: boolean;
}): { score: number; pendientes: CompletitudPendiente[] } {
  const { info, perfilConvivencia, verificado } = params;
  const pendientes: CompletitudPendiente[] = [];
  let score = 0;

  // Datos personales: foto + teléfono (20 pts)
  const tieneFoto = !!info?.fotoUrl;
  const tieneTelefono = !!info?.telefono;
  score += (tieneFoto ? 10 : 0) + (tieneTelefono ? 10 : 0);
  if (!tieneFoto) pendientes.push({ label: 'Sube tu foto de perfil', tab: 'personal' });
  if (!tieneTelefono) pendientes.push({ label: 'Agrega tu teléfono', tab: 'personal' });

  // Datos académicos: carrera + código + ciclo (20 pts)
  const camposAcademicos = [info?.carrera, info?.codigoEstudiante, info?.ciclo];
  const academicosCompletos = camposAcademicos.filter((v) => v !== undefined && v !== null && v !== '').length;
  score += Math.round((academicosCompletos / camposAcademicos.length) * 20);
  if (academicosCompletos < camposAcademicos.length) {
    pendientes.push({ label: 'Completa tus datos académicos', tab: 'academico' });
  }

  // Perfil de convivencia (30 pts) — reusa su propio % de completitud
  const completitudConvivencia = perfilConvivencia?.completitud ?? 0;
  score += Math.round((completitudConvivencia / 100) * 30);
  if (completitudConvivencia < 100) {
    pendientes.push({ label: 'Completa tu perfil de convivencia', tab: 'convivencia' });
  }

  // Verificación de identidad (30 pts)
  score += verificado ? 30 : 0;
  if (!verificado) pendientes.push({ label: 'Verifica tu identidad', tab: 'verificacion' });

  return { score: Math.min(100, Math.max(0, score)), pendientes };
}

/* ── Hero de perfil ── */
function ProfileHero() {
  const { usuario } = useAuth();
  const { verificado } = useVerificationStatus();
  const totalFavoritos = useFavoritesStore((s) => s.ids.size);
  const router = useRouter();
  const pathname = usePathname();

  const perfilId = usuario?.perfilId;
  const [info, setInfo] = useState<EstudianteInfo | null>(null);
  const [perfilConvivencia, setPerfilConvivencia] = useState<PerfilConvivencia | null>(null);

  // Trae score/nivel de reputación + datos personales/académicos ya guardados
  // (ítems 224 y 228) — mismo endpoint que ya usa personal-tab/academic-tab.
  useEffect(() => {
    if (!perfilId) return;
    studentProfileService
      .obtenerInfo(perfilId)
      .then((data) => setInfo(data))
      .catch(() => {
        /* sin datos aún: el hero degrada mostrando placeholders */
      });
  }, [perfilId]);

  // Completitud del perfil de convivencia (ítem 228) — mismo fetch que usa
  // el badge "Buscando roomie" en personal-tab.tsx.
  useEffect(() => {
    roommateService
      .miConvivencia()
      .then((p) => setPerfilConvivencia(p))
      .catch(() => {
        /* sin perfil de convivencia creado aún */
      });
  }, []);

  const irATab = (tab: TabValue) => router.push(`${pathname}?tab=${tab}`, { scroll: false });

  const { score: completitud, pendientes } = calcularCompletitudGlobal({
    info,
    perfilConvivencia,
    verificado,
  });

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {/* Gradiente decorativo de fondo */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/8 via-transparent to-transparent" />

      {/* Franja de color izquierda */}
      <div className="absolute left-0 top-0 h-full w-1.5 bg-primary" />

      {/* Contenido en una sola fila */}
      <div className="relative flex items-center gap-5 px-8 py-5">
        {/* Avatar */}
        <UserAvatar
          src={usuario?.avatar}
          nombre={usuario?.nombre ?? 'Avatar'}
          size="lg"
          className="shadow-md ring-2 ring-primary/20"
        />

        {/* Nombre + correo + badge */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold tracking-tight text-foreground">{usuario?.nombre}</h2>
            {verificado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
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
            <div className="flex justify-center">
              {info?.nivelReputacion ? (
                <ReputationBadge nivel={info.nivelReputacion} score={info.score} size="lg" />
              ) : (
                <Star className="mx-auto size-5 text-muted-foreground/40" />
              )}
            </div>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reputación</p>
          </div>
        </div>
      </div>

      {/* Completitud global del perfil (ítem 228) */}
      <div className="relative border-t border-border px-8 py-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
          <span className="text-muted-foreground">Perfil completo</span>
          <span className="text-primary">{completitud}%</span>
        </div>
        <Progress value={completitud} label={`Perfil global ${completitud}% completo`} />
        {pendientes.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {pendientes.map((p) => (
              <button
                key={p.tab + p.label}
                type="button"
                onClick={() => irATab(p.tab)}
                className="rounded-full border border-dashed border-primary/40 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                Te falta: {p.label} →
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tabs ── */
function ProfileTabs() {
  const [tab, setTab] = useTabParam({ values: TAB_VALUES, defaultValue: 'personal' });

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
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
