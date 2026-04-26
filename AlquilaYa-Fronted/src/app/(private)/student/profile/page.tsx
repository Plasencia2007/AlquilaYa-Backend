'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GraduationCap, Lock, ShieldCheck, User } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerificationPanel from '@/components/auth/verification-panel';

import { AcademicTab } from './academic-tab';
import { PersonalTab } from './personal-tab';
import { SecurityTab } from './security-tab';

const TABS = [
  { value: 'personal', label: 'Personal', icon: User },
  { value: 'academico', label: 'Académico', icon: GraduationCap },
  { value: 'seguridad', label: 'Seguridad', icon: Lock },
  { value: 'verificacion', label: 'Verificación', icon: ShieldCheck },
] as const;

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
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon className="size-4" /> {t.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="personal" className="rounded-2xl border border-border bg-card p-6">
        <PersonalTab />
      </TabsContent>
      <TabsContent value="academico" className="rounded-2xl border border-border bg-card p-6">
        <AcademicTab />
      </TabsContent>
      <TabsContent value="seguridad" className="rounded-2xl border border-border bg-card p-6">
        <SecurityTab />
      </TabsContent>
      <TabsContent value="verificacion" className="rounded-2xl border border-border bg-card p-6">
        <VerificationPanel />
      </TabsContent>
    </Tabs>
  );
}

export default function StudentProfilePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Mi perfil
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Gestiona tus datos, contraseña y verificación de identidad.
        </p>
      </header>

      <Suspense fallback={<div className="h-12 animate-pulse rounded-2xl bg-muted" />}>
        <ProfileTabs />
      </Suspense>
    </div>
  );
}
