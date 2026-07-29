'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Building2, Files } from 'lucide-react';
import { Card } from '@/components/ui/legacy-card';
import { Timeline, type TimelineStep } from '@/components/shared/timeline';
import { notify } from '@/lib/notify';
import { profileService } from '@/services/profile-service';
import { documentsService } from '@/services/documents-service';
import type { Perfil, Documento, TipoDocumento } from '@/types/profile';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DOC_LABELS: Record<TipoDocumento, string> = {
  DNI_FRONTAL: 'DNI — cara frontal',
  DNI_REVERSO: 'DNI — cara posterior',
  CARNE_ESTUDIANTE: 'Carné de estudiante',
  RECIBO_LUZ: 'Recibo de luz',
};

/** Construye el timeline de la verificación de DNI combinando frontal + reverso (ítem 340). */
function timelineDni(frontal: Documento | undefined, reverso: Documento | undefined): TimelineStep[] {
  const rechazado = [frontal, reverso].find(d => d?.estadoVerificacion === 'RECHAZADO');
  if (rechazado) {
    return [
      { title: 'DNI subido', status: 'completed' },
      {
        title: 'Rechazado',
        description: rechazado.comentarioRechazo || 'Vuelve a subir el documento desde tu perfil.',
        status: 'active',
      },
      { title: 'Verificado con RENIEC', status: 'pending' },
    ];
  }
  if (!frontal || !reverso) {
    return [
      {
        title: 'Sube tu DNI (frontal y posterior)',
        description: 'Ve a "Mi perfil" → Documentos de verificación y sube ambas caras.',
        status: 'active',
      },
      { title: 'En revisión', status: 'pending' },
      { title: 'Verificado con RENIEC', status: 'pending' },
    ];
  }
  if (frontal.estadoVerificacion === 'APROBADO' && reverso.estadoVerificacion === 'APROBADO') {
    return [
      { title: 'DNI subido', status: 'completed' },
      { title: 'Revisado por el equipo AlquilaYa', status: 'completed' },
      { title: 'Verificado con RENIEC', status: 'completed' },
    ];
  }
  return [
    { title: 'DNI subido', status: 'completed' },
    { title: 'En revisión', description: 'El equipo de AlquilaYa está validando tu documento.', status: 'active' },
    { title: 'Verificado con RENIEC', status: 'pending' },
  ];
}

/**
 * Timeline de RUC/SUNAT (ítem 340), a partir de `detallesArrendador.verificado`.
 *
 * OJO — hallazgo importante: pese a que el ítem lo describe como "verificación SUNAT",
 * en el backend real (`DocumentoService.actualizarEstadoVerificacion`, servicio-usuarios)
 * este flag se activa cuando un admin aprueba los DOCUMENTOS DE IDENTIDAD (DNI) del
 * arrendador — no hay ninguna consulta persistida a SUNAT detrás. `verificarRuc()` en
 * `profile-service.ts` sólo hace un lookup puntual (no guarda estado). Se deja el texto
 * honesto al respecto (ver nota bajo el timeline) en vez de prometer una verificación
 * SUNAT que hoy no existe.
 */
function timelineRuc(ruc: string | undefined, verificado: boolean): TimelineStep[] {
  if (!ruc) {
    return [
      {
        title: 'Registra tu RUC',
        description: 'Completa tu RUC en "Mi perfil" → Datos de arrendador.',
        status: 'active',
      },
      { title: 'Cuenta verificada', status: 'pending' },
    ];
  }
  return [
    { title: `RUC registrado (${ruc})`, status: 'completed' },
    verificado
      ? { title: 'Cuenta verificada', status: 'completed' }
      : {
          title: 'Cuenta verificada',
          description: 'Se activa cuando el equipo de AlquilaYa aprueba tus documentos de identidad.',
          status: 'active',
        },
  ];
}

function timelineDocumentos(documentos: Documento[]): TimelineStep[] {
  if (documentos.length === 0) {
    return [
      {
        title: 'Aún no subiste documentos',
        description: 'Sube tus documentos de verificación desde tu perfil.',
        status: 'active',
      },
    ];
  }
  return documentos.map((d): TimelineStep => ({
    title: DOC_LABELS[d.tipoDocumento] ?? d.tipoDocumento,
    description: d.estadoVerificacion === 'RECHAZADO' ? (d.comentarioRechazo || 'Rechazado') : undefined,
    status: d.estadoVerificacion === 'APROBADO' ? 'completed' : 'active',
  }));
}

function SeccionVerificacion({
  icon: Icon, titulo, descripcion, steps, nota,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  titulo: string;
  descripcion: string;
  steps: TimelineStep[];
  nota?: string;
}) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-foreground text-base font-black">{titulo}</h2>
          <p className="text-muted-foreground text-xs mt-0.5">{descripcion}</p>
        </div>
      </div>
      <Timeline steps={steps} className="pl-1" />
      {nota && <p className="text-[11px] text-muted-foreground/80 italic border-t border-border pt-3">{nota}</p>}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandlordVerificationPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // `cargando` ya arranca en `true` (useState(true)) y este efecto sólo corre
    // una vez al montar ([] deps) — llamar setCargando(true) aquí sería un no-op
    // redundante (y lo marca la regla react-hooks/set-state-in-effect).
    let cancelado = false;
    Promise.allSettled([
      profileService.obtenerMiPerfil(),
      documentsService.listarMisDocumentos(),
    ]).then(([perfilRes, docsRes]) => {
      if (cancelado) return;
      if (perfilRes.status === 'fulfilled') {
        setPerfil(perfilRes.value);
      } else {
        notify.error(perfilRes.reason, 'No se pudo cargar tu perfil');
      }
      if (docsRes.status === 'fulfilled') {
        setDocumentos(docsRes.value);
      } else {
        notify.error(docsRes.reason, 'No se pudieron cargar tus documentos');
      }
      setCargando(false);
    });
    return () => { cancelado = true; };
  }, []);

  if (cargando) {
    return (
      <div className="space-y-6 max-w-3xl animate-pulse">
        <div className="bg-card rounded-2xl p-6 h-20" />
        <div className="bg-card rounded-2xl p-6 h-56" />
        <div className="bg-card rounded-2xl p-6 h-48" />
        <div className="bg-card rounded-2xl p-6 h-56" />
      </div>
    );
  }

  const frontal = documentos.find(d => d.tipoDocumento === 'DNI_FRONTAL');
  const reverso = documentos.find(d => d.tipoDocumento === 'DNI_REVERSO');

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-400 pb-12">
      <header>
        <h1 className="text-3xl font-black text-foreground tracking-tighter opacity-90">
          Verificación de cuenta
        </h1>
        <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
          Estado de tus verificaciones de identidad y documentos ante AlquilaYa.
        </p>
        <p className="text-muted-foreground text-xs mt-2">
          ¿Necesitas subir o corregir algo?{' '}
          <Link href="/landlord/profile" className="text-primary font-bold hover:underline">
            Ve a tu perfil
          </Link>.
        </p>
      </header>

      <SeccionVerificacion
        icon={ShieldCheck}
        titulo="DNI (RENIEC)"
        descripcion="Validación de tu documento de identidad."
        steps={timelineDni(frontal, reverso)}
      />

      <SeccionVerificacion
        icon={Building2}
        titulo="RUC (SUNAT)"
        descripcion="Datos comerciales de tu cuenta de arrendador."
        steps={timelineRuc(perfil?.detallesArrendador?.ruc, perfil?.detallesArrendador?.verificado ?? false)}
        nota="Este estado refleja la aprobación de tus documentos de identidad por el equipo de AlquilaYa; no es una consulta en vivo a SUNAT."
      />

      <SeccionVerificacion
        icon={Files}
        titulo="Documentos generales"
        descripcion="Todos los documentos que subiste para revisión."
        steps={timelineDocumentos(documentos)}
      />
    </div>
  );
}
