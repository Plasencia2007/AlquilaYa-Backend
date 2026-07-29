'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Check, Crown, MessageCircle, Share2, Trash2, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Progress } from '@/components/ui/progress';
import { CenteredSpinner } from '@/components/shared/centered-spinner';
import { ErrorState } from '@/components/shared/error-state';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { formatPEN } from '@/lib/money';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { RoommateCard } from '@/components/student/roommate-card';
import { grupoService, type CuotaPago, type GrupoRoommate } from '@/services/grupo-service';
import { pagoService } from '@/services/pago-service';
import { roommateService, type PerfilConvivencia } from '@/services/roommate-service';

/** Regex de link de grupo de WhatsApp (mismo patrón que valida el backend, ítem 221). */
const LINK_WHATSAPP_RE = /^https:\/\/chat\.whatsapp\.com\/.+$/;

export default function GrupoDetallePage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const codigoInvitado = search?.get('codigo') ?? null;
  const id = params?.id;

  const [grupo, setGrupo] = useState<GrupoRoommate | null>(null);
  const [miId, setMiId] = useState<number | null>(null);
  const [perfiles, setPerfiles] = useState<Record<number, PerfilConvivencia>>({});
  const [cuotas, setCuotas] = useState<CuotaPago[]>([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no-encontrado' | 'error'>('cargando');
  const [accion, setAccion] = useState(false);
  const [linkWhatsappInput, setLinkWhatsappInput] = useState('');
  // true una vez que YA se cargó el grupo con éxito alguna vez: distingue el fallo inicial
  // (pantalla en blanco, ítem 218) de un refresh en segundo plano (tras aprobar/salir/etc.),
  // que debe seguir mostrando el toast de siempre en vez de tapar la página ya cargada.
  const cargadoRef = useRef(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    let g: GrupoRoommate;
    try {
      g = await grupoService.obtener(id);
    } catch (err) {
      if (!cargadoRef.current) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        setEstado(status === 404 ? 'no-encontrado' : 'error');
      } else {
        notify.error(err, 'No se pudo actualizar el grupo.');
      }
      return;
    }
    cargadoRef.current = true;
    setGrupo(g);
    setLinkWhatsappInput(g.linkWhatsapp ?? '');
    setEstado('ok');
    try {
      const mi = await roommateService.miConvivencia().catch(() => null);
      setMiId(mi?.estudianteId ?? null);
      const entradas = await Promise.all(
        g.miembros.map(async (m) => {
          try {
            return [m.estudianteId, await roommateService.convivenciaDe(m.estudianteId)] as const;
          } catch {
            return null;
          }
        }),
      );
      setPerfiles(Object.fromEntries(entradas.filter(Boolean) as [number, PerfilConvivencia][]));
      if (g.reservaId) {
        grupoService.cuotas(g.reservaId).then(setCuotas).catch(() => setCuotas([]));
      } else {
        setCuotas([]);
      }
    } catch (err) {
      notify.error(err, 'No se pudo cargar el grupo.');
    }
  }, [id]);

  const reintentar = () => {
    setEstado('cargando');
    void cargar();
  };

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setAccion(true);
    try {
      await fn();
      notify.success(ok);
      await cargar();
    } catch (err) {
      notify.error(err, 'No se pudo completar la acción.');
    } finally {
      setAccion(false);
    }
  };

  const pagarMiParte = async () => {
    if (!grupo?.reservaId) return;
    setAccion(true);
    try {
      const { url } = await pagoService.crearPreferenciaGrupo(grupo.reservaId);
      if (url) {
        const win = window.open(url, '_blank');
        if (!win) window.location.href = url;
      }
    } catch (err) {
      notify.error(err, 'No se pudo iniciar el pago de tu cuota.');
    } finally {
      setAccion(false);
    }
  };

  if (estado === 'cargando') {
    return <CenteredSpinner className="py-24" />;
  }

  if (estado === 'no-encontrado') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <ErrorState
          title="Grupo no encontrado"
          description="Es posible que el grupo ya no exista o el enlace sea incorrecto."
          retryLabel="Volver a mis grupos"
          onRetry={() => {
            window.location.href = '/student/groups';
          }}
        />
      </div>
    );
  }

  if (estado === 'error' || !grupo) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <ErrorState
          title="No pudimos cargar el grupo"
          description="Ocurrió un problema de conexión. Inténtalo de nuevo."
          retryLabel="Reintentar"
          onRetry={reintentar}
        />
      </div>
    );
  }

  const miMembresia = grupo.miembros.find((m) => m.estudianteId === miId);
  const soyCreador = grupo.creadorEstudianteId === miId;
  const soyMiembro = miMembresia?.estado === 'CREADOR' || miMembresia?.estado === 'UNIDO';
  const soySolicitante = miMembresia?.estado === 'SOLICITADO';
  const lleno = grupo.cuposOcupados >= grupo.cuposTotales;
  const pct = Math.round((grupo.cuposOcupados / grupo.cuposTotales) * 100);

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/student/groups/${grupo.id}?codigo=${grupo.codigoInvitacion}`
      : '';
  const inviteText = `Únete a mi grupo para alquilar en AlquilaYa: ${inviteUrl}`;
  const whatsappInviteUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const compartirInvitacion = async () => {
    try {
      await navigator.share({ title: 'Invitación a grupo AlquilaYa', text: inviteText, url: inviteUrl });
    } catch {
      // usuario canceló el share nativo -> se ignora
    }
  };

  const linkWhatsappValido =
    linkWhatsappInput.trim() === '' || LINK_WHATSAPP_RE.test(linkWhatsappInput.trim());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <PageBreadcrumb
        className="mb-4"
        items={[
          { label: 'Mi panel', href: '/student' },
          { label: 'Mis grupos', href: '/student/groups' },
          { label: grupo.nombre || 'Grupo' },
        ]}
      />

      {/* Encabezado */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-h1 truncate">{grupo.nombre}</h1>
            <Link
              href={`/property/${grupo.propiedadId}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {grupo.propiedadTitulo}
            </Link>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {grupo.estado}
          </span>
        </div>
        {grupo.descripcion && <p className="mt-2 text-sm text-muted-foreground">{grupo.descripcion}</p>}

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-bold">
            <span className="text-muted-foreground">Cupos</span>
            <span className="text-primary">
              {grupo.cuposOcupados}/{grupo.cuposTotales}
            </span>
          </div>
          <Progress value={pct} label={`${grupo.cuposOcupados} de ${grupo.cuposTotales} cupos ocupados`} />
        </div>

        {/* Acciones del visitante */}
        <div className="mt-5 flex flex-wrap gap-2">
          {!miMembresia && grupo.estado === 'ABIERTO' && !lleno && (
            <>
              {codigoInvitado && (
                <Button onClick={() => run(() => grupoService.unirse(codigoInvitado), 'Te uniste al grupo')} disabled={accion} className="gap-1.5 font-bold">
                  <UserPlus className="size-4" /> Unirme con invitación
                </Button>
              )}
              <Button variant={codigoInvitado ? 'outline' : 'default'} onClick={() => run(() => grupoService.solicitar(grupo.id), 'Solicitud enviada')} disabled={accion} className="gap-1.5 font-bold">
                Solicitar unirme
              </Button>
            </>
          )}
          {soySolicitante && <span className="text-sm font-semibold text-warning">Tu solicitud está pendiente de aprobación.</span>}
          {soyMiembro && !soyCreador && (
            <Button variant="outline" onClick={() => run(() => grupoService.salir(grupo.id), 'Saliste del grupo')} disabled={accion}>
              Salir del grupo
            </Button>
          )}
          {soyCreador && (
            <Button variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/5" onClick={() => run(() => grupoService.eliminar(grupo.id), 'Grupo eliminado')} disabled={accion}>
              <Trash2 className="size-4" /> Eliminar grupo
            </Button>
          )}
        </div>
      </div>

      {/* Fase 2: reservar en grupo (creador, grupo COMPLETO) */}
      {soyCreador && grupo.estado === 'COMPLETO' && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="font-bold text-foreground">¡Grupo completo! Reserven juntos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige las fechas de la estadía; luego cada miembro paga su parte.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">Entrada</span>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">Salida</span>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </label>
          </div>
          <Button className="mt-3 w-full font-bold" disabled={accion || !fechaInicio || !fechaFin}
            onClick={() => run(() => grupoService.reservar(grupo.id, { fechaInicio, fechaFin }), 'Reserva grupal creada')}>
            Reservar en grupo
          </Button>
        </div>
      )}

      {/* Fase 2: pago dividido (grupo RESERVADO) */}
      {grupo.estado === 'RESERVADO' && grupo.reservaId && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">Pago dividido</h3>
            <Button variant="ghost" size="sm" onClick={() => cargar()} disabled={accion}>
              Actualizar
            </Button>
          </div>
          {(() => {
            const pagadas = cuotas.filter((c) => c.estado === 'PAGADO').length;
            const pct = cuotas.length ? Math.round((pagadas / cuotas.length) * 100) : 0;
            const miCuota = cuotas.find((c) => c.estudianteId === miId);
            return (
              <>
                <div className="mb-1 mt-2 flex justify-between text-xs font-bold">
                  <span className="text-muted-foreground">Pagaron</span>
                  <span className="text-primary">{pagadas}/{cuotas.length}</span>
                </div>
                <Progress value={pct} label={`${pagadas} de ${cuotas.length} cuotas pagadas`} />
                <div className="mt-3 space-y-1.5">
                  {cuotas.map((c) => (
                    <div key={c.estudianteId} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {perfiles[c.estudianteId]?.nombre ?? `Estudiante ${c.estudianteId}`}
                        {c.estudianteId === miId ? ' (tú)' : ''}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tnum font-semibold text-foreground">{formatPEN(c.monto)}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold',
                          c.estado === 'PAGADO' ? 'bg-success-light text-success' : 'bg-warning-light text-warning')}>
                          {c.estado === 'PAGADO' ? 'Pagó' : 'Pendiente'}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                {miCuota && miCuota.estado === 'PENDIENTE' && (
                  <Button className="mt-4 w-full font-bold" disabled={accion} onClick={pagarMiParte}>
                    Pagar mi parte · {formatPEN(miCuota.monto)}
                  </Button>
                )}
                {cuotas.length > 0 && pagadas === cuotas.length && (
                  <p className="mt-3 text-center text-sm font-bold text-success">
                    ¡Todos pagaron! La reserva quedará confirmada. 🎉
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Link de invitación (solo miembros) */}
      {soyMiembro && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-bold text-foreground">Invita a tus amigos</p>
          <div className="flex items-center gap-2">
            <input readOnly value={inviteUrl} className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs" />
            <CopyButton value={inviteUrl} errorMessage="No se pudo copiar el link." />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={whatsappInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
            {canShare && (
              <button
                type="button"
                onClick={compartirInvitacion}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Share2 className="size-3.5" /> Compartir
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grupo de WhatsApp para coordinar (ítem 221, alternativa de bajo costo al chat grupal:
          servicio-mensajeria solo soporta conversaciones 1-a-1). Solo el creador lo edita; el
          resto de miembros solo ve el botón si ya hay un link guardado. */}
      {soyMiembro && (grupo.linkWhatsapp || soyCreador) && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-bold text-foreground">Grupo de WhatsApp</p>
          {grupo.linkWhatsapp && (
            <a
              href={grupo.linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-success-light px-3 py-1.5 text-xs font-bold text-success transition-colors hover:opacity-90"
            >
              <MessageCircle className="size-3.5" /> Abrir grupo de WhatsApp
            </a>
          )}
          {soyCreador && (
            <>
              <div className={cn('flex items-center gap-2', grupo.linkWhatsapp && 'mt-3')}>
                <input
                  value={linkWhatsappInput}
                  onChange={(e) => setLinkWhatsappInput(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs"
                />
                <Button
                  size="sm"
                  disabled={
                    accion ||
                    !linkWhatsappValido ||
                    linkWhatsappInput.trim() === (grupo.linkWhatsapp ?? '')
                  }
                  onClick={() =>
                    run(
                      () => grupoService.actualizarWhatsapp(grupo.id, linkWhatsappInput.trim()),
                      'Link de WhatsApp guardado',
                    )
                  }
                >
                  Guardar
                </Button>
              </div>
              {!linkWhatsappValido && (
                <p className="mt-1 text-[11px] text-destructive">
                  El link debe empezar con https://chat.whatsapp.com/
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Crea el grupo en tu app de WhatsApp y pega aquí el link de invitación.
              </p>
            </>
          )}
        </div>
      )}

      {/* Miembros */}
      <h2 className="mb-3 mt-8 text-lg font-black text-foreground">Integrantes</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {grupo.miembros.map((m) => {
          const perfil = perfiles[m.estudianteId];
          return (
            <div key={m.estudianteId} className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                    m.estado === 'CREADOR'
                      ? 'bg-primary/10 text-primary'
                      : m.estado === 'SOLICITADO'
                        ? 'bg-warning-light text-warning'
                        : 'bg-success-light text-success',
                  )}
                >
                  {m.estado === 'CREADOR' && <Crown className="size-3" />}
                  {m.estado === 'CREADOR' ? 'Creador' : m.estado === 'SOLICITADO' ? 'Solicitó' : 'Miembro'}
                </span>
                {soyCreador && m.estado === 'SOLICITADO' && (
                  <Button size="sm" disabled={accion || lleno} onClick={() => run(() => grupoService.aprobar(grupo.id, m.estudianteId), 'Miembro aprobado')} className="h-7 gap-1 text-xs">
                    <Check className="size-3.5" /> Aprobar
                  </Button>
                )}
              </div>
              {perfil ? (
                <RoommateCard perfil={perfil} />
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Estudiante #{m.estudianteId}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
