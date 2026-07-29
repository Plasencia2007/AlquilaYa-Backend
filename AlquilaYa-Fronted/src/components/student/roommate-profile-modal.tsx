'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';

import {
  AtSign,
  BadgeCheck,
  Cigarette,
  Clock,
  DoorOpen,
  GraduationCap,
  MapPin,
  MessageCircle,
  PartyPopper,
  PawPrint,
  Sparkles,
  UserPlus,
  UserRound,
  Volume2,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ReputationBadge } from '@/components/shared/reputation-badge';
import { useAuth } from '@/hooks/use-auth';
import { formatPEN } from '@/lib/money';
import { notify } from '@/lib/notify';
import { formatearFecha } from '@/lib/relative-time';
import { conversationService } from '@/services/conversation-service';
import { grupoService, type GrupoRoommate } from '@/services/grupo-service';
import { labelOpcion, type DesgloseCompatItem, type PerfilConvivencia } from '@/services/roommate-service';

interface Props {
  perfil: PerfilConvivencia;
  /** Mismo dato que ya recibe `RoommateCard` (ítem 215) — no se recalcula acá. */
  compat?: { score: number; nivel: string; detalle?: DesgloseCompatItem[] } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CampoHabito = 'horario' | 'orden' | 'ruido' | 'sociabilidad' | 'mascotas' | 'invitados' | 'fuma';

const HABITOS: { campo: CampoHabito; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { campo: 'horario', label: 'Horario', Icon: Clock },
  { campo: 'orden', label: 'Orden', Icon: Sparkles },
  { campo: 'ruido', label: 'Ruido', Icon: Volume2 },
  { campo: 'sociabilidad', label: 'Sociabilidad', Icon: PartyPopper },
  { campo: 'mascotas', label: 'Mascotas', Icon: PawPrint },
  { campo: 'invitados', label: 'Invitados', Icon: DoorOpen },
  { campo: 'fuma', label: 'Fuma', Icon: Cigarette },
];

/**
 * Perfil completo de un roommate (ítem 249): abierto desde `RoommateCard`. Reusa el mismo
 * `compat`/`compatibilidadDesglose` que ya calcula el backend (ítem 215), no lo recalcula.
 *
 * "Enviar mensaje" crea (o recupera, es idempotente) una conversación `ROOMMATE` vía
 * `conversationService.crearOObtener(..., 'ROOMMATE')` y navega al chat. Antes quedaba
 * deshabilitado: `ConversacionService.crearOObtener` en servicio-mensajeria armaba la tupla
 * asumiendo SIEMPRE un estudiante y un arrendador, así que una conversación estudiante→estudiante
 * forzada por ese camino jamás habría llegado al destinatario (su id habría quedado en
 * `arrendadorId`, columna que `findDelParticipante` no revisa para el rol ESTUDIANTE). El
 * backend ahora soporta un tipo `ROOMMATE` dedicado, sin arrendador ni propiedad.
 *
 * "Invitar a mi grupo" reusa infraestructura existente: no hay endpoint para agregar un
 * miembro directamente (unirse a un grupo siempre es una acción del propio estudiante, vía
 * `solicitar`+`aprobar` o `unirse` con código — ver GrupoRoommateService), así que se genera el
 * mismo link de invitación que ya arma `groups/[id]/page.tsx` y se copia al portapapeles para
 * que el estudiante se lo envíe a la persona por su cuenta.
 */
export function RoommateProfileModal({ perfil, compat, open, onOpenChange }: Props) {
  const { usuario } = useAuth();
  const router = useRouter();

  const esPropio = usuario?.perfilId != null && usuario.perfilId === perfil.estudianteId;
  const puedeInteractuar = usuario?.rol === 'ESTUDIANTE' && !esPropio;

  // `null` = todavía no se cargó (o está recargando en segundo plano tras reabrir el modal).
  // No se resetea a `null` en cada apertura a propósito: si ya había datos de una apertura
  // previa se siguen mostrando mientras el fetch en curso los refresca (evita parpadeo).
  const [misGrupos, setMisGrupos] = useState<GrupoRoommate[] | null>(null);
  const [grupoElegidoId, setGrupoElegidoId] = useState<number | null>(null);
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  const irAlChat = async () => {
    if (enviandoMensaje) return;
    setEnviandoMensaje(true);
    try {
      const conv = await conversationService.crearOObtener(
        perfil.estudianteId,
        undefined,
        'ROOMMATE',
      );
      onOpenChange(false);
      router.push(`/student/messages/${conv.id}`);
    } catch (err) {
      notify.error(err, 'No pudimos abrir el chat');
    } finally {
      setEnviandoMensaje(false);
    }
  };

  useEffect(() => {
    if (!open || !puedeInteractuar) return;
    let cancelado = false;
    grupoService
      .mios()
      .then((grupos) => {
        if (!cancelado) setMisGrupos(grupos);
      })
      .catch(() => {
        if (!cancelado) setMisGrupos((prev) => prev ?? []);
      });
    return () => {
      cancelado = true;
    };
  }, [open, puedeInteractuar]);

  const habitos = HABITOS.map((h) => ({ ...h, valor: labelOpcion(h.campo, perfil[h.campo]) })).filter(
    (h): h is typeof h & { valor: string } => !!h.valor,
  );

  // Solo grupos que realmente pueden recibir un nuevo miembro (evita mandar un link que
  // el backend rechazará por grupo lleno/cerrado — ver GrupoRoommateService.validarUnible).
  const gruposInvitables = (misGrupos ?? []).filter(
    (g) => g.estado === 'ABIERTO' && g.cuposOcupados < g.cuposTotales,
  );
  const grupoElegido =
    gruposInvitables.find((g) => g.id === grupoElegidoId) ?? gruposInvitables[0] ?? null;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteText = grupoElegido
    ? `¡Hola${perfil.nombre ? ' ' + perfil.nombre : ''}! Te invito a unirte a mi grupo "${grupoElegido.nombre}" en AlquilaYa: ${origin}/student/groups/${grupoElegido.id}?codigo=${grupoElegido.codigoInvitacion}`
    : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border p-6 pb-4 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
              {perfil.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={perfil.avatar} alt={perfil.nombre ?? 'Estudiante'} className="size-20 object-cover" />
              ) : (
                <UserRound className="size-9" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-1.5 text-xl">
                <span className="truncate">
                  {perfil.nombre ?? 'Estudiante'} {perfil.apellido ?? ''}
                </span>
                {perfil.verificado && (
                  <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verificado" />
                )}
              </SheetTitle>
              {(perfil.carrera || perfil.ciclo || perfil.universidad) && (
                <SheetDescription className="flex items-center gap-1 truncate">
                  <GraduationCap className="size-3.5 shrink-0" />
                  {[perfil.universidad, perfil.carrera].filter(Boolean).join(' · ')}
                  {perfil.ciclo ? ` · ciclo ${perfil.ciclo}` : ''}
                </SheetDescription>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {perfil.nivelReputacion && (
                  <ReputationBadge nivel={perfil.nivelReputacion} score={perfil.score} size="sm" />
                )}
                <span className="text-[11px] font-bold text-primary">{perfil.completitud}% de perfil</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {perfil.bio && (
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sobre mí
              </h3>
              <p className="text-sm text-foreground">{perfil.bio}</p>
            </section>
          )}

          {compat && compat.detalle?.length ? (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Compatibilidad
                </h3>
                <span className="text-xs font-bold text-primary">
                  {compat.nivel} · {compat.score}%
                </span>
              </div>
              <div className="space-y-2.5">
                {compat.detalle.map((d) => (
                  <div key={d.campo}>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className={d.coincide ? 'text-success' : 'text-muted-foreground'}>
                        {d.coincide ? 'Coincide' : 'Distinto'}
                      </span>
                    </div>
                    <Progress
                      value={100}
                      indicatorClassName={d.coincide ? 'bg-success' : 'bg-muted-foreground/30'}
                      label={`${d.label}: ${d.coincide ? 'coincide' : 'distinto'}`}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : compat ? (
            <section className={`rounded-lg px-2.5 py-1.5 text-center text-xs font-bold ${compat.nivel === 'Alta' ? 'bg-success-light text-success' : compat.nivel === 'Media' ? 'bg-warning-light text-warning' : 'bg-muted text-muted-foreground'}`}>
              Compatibilidad {compat.nivel} · {compat.score}%
            </section>
          ) : null}

          {habitos.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Hábitos de convivencia
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {habitos.map(({ campo, label, Icon, valor }) => (
                  <div key={campo} className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-2">
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
                      <p className="truncate text-xs font-semibold text-foreground">{valor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Preferencias
            </h3>
            <div className="space-y-1.5 text-sm text-foreground">
              {perfil.presupuestoMax != null && (
                <p className="flex items-center gap-2">
                  <Wallet className="size-3.5 shrink-0 text-muted-foreground" />
                  Presupuesto {perfil.presupuestoMin != null ? `${formatPEN(perfil.presupuestoMin)} – ` : 'hasta '}
                  {formatPEN(perfil.presupuestoMax)}
                </p>
              )}
              {perfil.zonasPreferidas?.length > 0 && (
                <p className="flex items-center gap-2">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                  {perfil.zonasPreferidas.join(', ')}
                </p>
              )}
              {perfil.fechaMudanza && (
                <p className="flex items-center gap-2">
                  <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                  Se muda: {formatearFecha(perfil.fechaMudanza)}
                </p>
              )}
              {perfil.numCompaneros != null && (
                <p className="flex items-center gap-2">
                  <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
                  Busca {perfil.numCompaneros} compañero{perfil.numCompaneros === 1 ? '' : 's'}
                </p>
              )}
              {(perfil.genero || perfil.comparteCon) && (
                <p className="flex items-center gap-2">
                  <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
                  {[labelOpcion('genero', perfil.genero), labelOpcion('comparteCon', perfil.comparteCon)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              {perfil.instagram && (
                <p className="flex items-center gap-2">
                  <AtSign className="size-3.5 shrink-0 text-muted-foreground" />
                  {perfil.instagram}
                </p>
              )}
            </div>
            {perfil.intereses?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {perfil.intereses.map((i) => (
                  <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                    {i}
                  </span>
                ))}
              </div>
            )}
          </section>

          {puedeInteractuar && (
            <section className="space-y-3 border-t border-border pt-4">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={irAlChat}
                disabled={enviandoMensaje}
              >
                <MessageCircle className="size-4" />
                {enviandoMensaje ? 'Abriendo chat…' : 'Enviar mensaje'}
              </Button>

              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <UserPlus className="size-3.5" /> Invitar a mi grupo
                </p>
                {misGrupos === null ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : gruposInvitables.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {misGrupos && misGrupos.length > 0
                      ? 'Tus grupos ya están completos o cerrados.'
                      : 'Aún no tienes un grupo abierto. Crea uno desde la ficha de un departamento.'}
                  </p>
                ) : (
                  <>
                    {gruposInvitables.length > 1 && (
                      <Select
                        value={String(grupoElegido?.id ?? '')}
                        onValueChange={(v) => setGrupoElegidoId(Number(v))}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Elige un grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          {gruposInvitables.map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>
                              {g.nombre} ({g.cuposOcupados}/{g.cuposTotales})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {grupoElegido && (
                      <>
                        <CopyButton
                          value={inviteText}
                          label={`Copiar invitación a "${grupoElegido.nombre}"`}
                          copiedLabel="Invitación copiada"
                          className="w-full justify-center"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Envíasela a {perfil.nombre ?? 'esta persona'} por WhatsApp o donde ya hablen.
                        </p>
                      </>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {esPropio && (
            <p className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
              Este es tu perfil.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
