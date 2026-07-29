import { api } from '@/lib/api';
import type { Page } from '@/types/pagination';
import type { Desembolso, EstadoDesembolso } from '@/services/desembolso-service';

interface PreferenciaResponse {
  /** URL de checkout de Mercado Pago. El backend la devuelve como { url }. */
  url: string;
}

/** Ítem 292: `cuponCodigo` es opcional — si se omite, se paga sin cupón (comportamiento previo). */
async function crearPreferencia(
  reservaId: string | number,
  cuponCodigo?: string,
): Promise<PreferenciaResponse> {
  const { data } = await api.post<PreferenciaResponse>(
    `/pagos/preferencia/${reservaId}`,
    cuponCodigo ? { cuponCodigo } : undefined,
  );
  return data;
}

/** Pago dividido (#38 Fase 2): link para pagar la cuota propia de una reserva grupal. */
async function crearPreferenciaGrupo(reservaId: string | number): Promise<PreferenciaResponse> {
  const { data } = await api.post<PreferenciaResponse>(`/pagos/preferencia-grupo/${reservaId}`);
  return data;
}

/**
 * Simula un pago exitoso SIN pasar por Mercado Pago. Solo existe en el backend fuera del
 * perfil `prod` (`DevOnlyPagoController`, `@Profile("!prod")`) — úsalo únicamente detrás de
 * un gate de entorno de desarrollo en la UI.
 */
async function simularExito(reservaId: string | number): Promise<void> {
  await api.post(`/pagos/simular-exito/${reservaId}`);
}

export type EstadoPago =
  | 'SIN_PAGO'
  | 'PENDIENTE'
  | 'PENDIENTE_REVISION'
  | 'PAGADO'
  | 'RECHAZADO'
  | 'DISCREPANCIA'
  | 'EXPIRADO'
  /** Ítem 289: el `RefundService` del backend actualiza la misma fila de Pago a estos estados. */
  | 'REEMBOLSADO'
  | 'REEMBOLSO_FALLIDO';

export interface EstadoPagoResponse {
  estado: EstadoPago;
  paymentId: string | null;
  monto: number | null;
  fechaPago: string | null;
}

/** Estado del último pago de una reserva. Para hacer polling mientras se paga en Mercado Pago. */
async function getEstadoPago(reservaId: string | number): Promise<EstadoPagoResponse> {
  const { data } = await api.get<EstadoPagoResponse>(`/pagos/estado/${reservaId}`);
  return data;
}

export interface ResumenFinancieroMes {
  mes: string; // YYYY-MM
  cobrado: number;
  comision: number;
  arrendador: number;
  numPagos: number;
}

export interface ResumenFinanciero {
  totalCobrado: number;
  totalComision: number;
  totalArrendador: number;
  numPagos: number;
  porMes: ResumenFinancieroMes[];
}

/** Resumen financiero de plataforma (solo ADMIN). */
async function obtenerResumenFinanciero(): Promise<ResumenFinanciero> {
  const { data } = await api.get<ResumenFinanciero>('/pagos/admin/resumen');
  return {
    totalCobrado: Number(data.totalCobrado ?? 0),
    totalComision: Number(data.totalComision ?? 0),
    totalArrendador: Number(data.totalArrendador ?? 0),
    numPagos: Number(data.numPagos ?? 0),
    porMes: (data.porMes ?? []).map((m) => ({
      mes: m.mes,
      cobrado: Number(m.cobrado ?? 0),
      comision: Number(m.comision ?? 0),
      arrendador: Number(m.arrendador ?? 0),
      numPagos: Number(m.numPagos ?? 0),
    })),
  };
}

/** Fila del historial de pagos del estudiante (ítem 279). */
export interface PagoHistorial {
  id: number;
  reservaId: number;
  monto: number;
  comision: number;
  estado: EstadoPago;
  fechaPago: string | null;
  fechaCreacion: string;
  /** Null si el backend no pudo resolverlo vía Feign a servicio-propiedades. */
  propiedadTitulo: string | null;
}

interface PagoHistorialDTO {
  id: number;
  reservaId: number;
  monto: number;
  comision: number;
  estado: EstadoPago;
  fechaPago: string | null;
  fechaCreacion: string;
  propiedadTitulo: string | null;
}

function fromHistorialDTO(dto: PagoHistorialDTO): PagoHistorial {
  return {
    id: dto.id,
    reservaId: dto.reservaId,
    monto: Number(dto.monto ?? 0),
    comision: Number(dto.comision ?? 0),
    estado: dto.estado,
    fechaPago: dto.fechaPago,
    fechaCreacion: dto.fechaCreacion,
    propiedadTitulo: dto.propiedadTitulo,
  };
}

/** Historial paginado de pagos del estudiante autenticado (ítem 279). */
async function listarMisPagos(page = 0, size = 10): Promise<Page<PagoHistorial>> {
  const { data } = await api.get<Page<PagoHistorialDTO>>('/pagos/mis', {
    params: { page, size },
  });
  return { ...data, content: data.content.map(fromHistorialDTO) };
}

/** Fila del historial de pagos del arrendador (ítem 318) — trae la `fechaPago` REAL del pago
 *  (a diferencia de `Reserva.fechaInicio`, que es lo único que había antes para agrupar). */
export interface PagoHistorialArrendador {
  id: number;
  reservaId: number;
  monto: number;
  comision: number;
  /** Lo que el arrendador realmente recibe (monto sin la comisión de plataforma). */
  montoArrendador: number;
  estado: EstadoPago;
  fechaPago: string | null;
  fechaCreacion: string;
  /** Null si el backend no pudo resolverlo vía Feign a servicio-propiedades. */
  propiedadTitulo: string | null;
  /** Ítem 344: id de la propiedad (mismo Feign que resuelve `propiedadTitulo`) — permite filtrar
   *  por id en vez de matchear por título, igual que el resto de páginas de finanzas/reservas. */
  propiedadId: number | null;
}

interface PagoHistorialArrendadorDTO {
  id: number;
  reservaId: number;
  monto: number;
  comision: number;
  montoArrendador: number;
  estado: EstadoPago;
  fechaPago: string | null;
  fechaCreacion: string;
  propiedadTitulo: string | null;
  propiedadId: number | null;
}

function fromHistorialArrendadorDTO(dto: PagoHistorialArrendadorDTO): PagoHistorialArrendador {
  return {
    id: dto.id,
    reservaId: dto.reservaId,
    monto: Number(dto.monto ?? 0),
    comision: Number(dto.comision ?? 0),
    montoArrendador: Number(dto.montoArrendador ?? 0),
    estado: dto.estado,
    fechaPago: dto.fechaPago,
    fechaCreacion: dto.fechaCreacion,
    propiedadTitulo: dto.propiedadTitulo,
    propiedadId: dto.propiedadId ?? null,
  };
}

/**
 * Ítem 318: historial COMPLETO de pagos PAGADOs del arrendador autenticado, self-service — el
 * backend (`PagoController#historialArrendador`, `GET /api/v1/pagos/arrendador/historial`)
 * filtra siempre por el `perfilId` del JWT, nunca por un id que venga del cliente. Sin paginar
 * (a propósito, ver el Javadoc de `PagoService#listarHistorialArrendador`): las páginas de
 * finanzas del arrendador filtran/agrupan client-side sobre la lista completa.
 */
async function listarHistorialArrendador(): Promise<PagoHistorialArrendador[]> {
  const { data } = await api.get<PagoHistorialArrendadorDTO[]>('/pagos/arrendador/historial');
  return data.map(fromHistorialArrendadorDTO);
}

/**
 * PDF del comprobante de pago de una reserva (ítem 280). Mismo patrón `responseType: 'blob'`
 * que `reservationService.descargarContrato`.
 */
async function descargarComprobante(reservaId: string | number): Promise<Blob> {
  const { data } = await api.get<Blob>(`/pagos/reserva/${reservaId}/comprobante`, {
    responseType: 'blob',
  });
  return data;
}

export interface NpsRequest {
  reservaId: string | number;
  score: number;
  comentario?: string;
}

/** Ítem 298: encuesta NPS post-transacción, mostrada una vez en la página de éxito de pago. */
async function enviarNps(request: NpsRequest): Promise<void> {
  await api.post('/pagos/nps', request);
}

/** Ítem 276: public key de Mercado Pago para inicializar el SDK Bricks en el navegador. */
async function obtenerPublicKey(): Promise<string> {
  const { data } = await api.get<{ publicKey: string }>('/pagos/mercadopago/public-key');
  return data.publicKey;
}

export interface PagoBricksResponse {
  id: number;
  status: string;
  statusDetail: string | null;
}

/**
 * Ítem 276: envía el `formData` que el Payment Brick tokenizó en el navegador (nunca el número de
 * tarjeta en claro, eso lo maneja el SDK de MP client-side) para que el backend cree el Payment
 * directo. Devuelve el estado inmediato — la confirmación real de la reserva sigue llegando por
 * el webhook, igual que con Checkout Pro; el frontend debe redirigir a `/pago/pendiente` (o
 * `/pago/exito` si `status === 'approved'`) para que el polling ya existente confirme el resto.
 */
async function procesarPagoBricks(
  reservaId: string | number,
  formData: Record<string, unknown>,
): Promise<PagoBricksResponse> {
  const { data } = await api.post<PagoBricksResponse>(`/pagos/bricks/procesar/${reservaId}`, formData);
  return data;
}

export interface ValidarCuponResponse {
  valido: boolean;
  mensaje: string;
  montoDescuento: number;
  comisionFinal: number;
  totalConDescuento: number;
}

/**
 * Ítem 292: preview de un cupón para una reserva ANTES de confirmar el pago (solo Checkout Pro —
 * el flujo Bricks no soporta cupones en esta primera versión). `valido: false` es una respuesta
 * normal (cupón vencido, agotado, código inexistente, etc.), no un error HTTP.
 */
async function validarCupon(reservaId: string | number, codigo: string): Promise<ValidarCuponResponse> {
  const { data } = await api.post<ValidarCuponResponse>('/pagos/cupones/validar', { codigo, reservaId });
  return data;
}

export const pagoService = {
  crearPreferencia,
  crearPreferenciaGrupo,
  getEstadoPago,
  obtenerResumenFinanciero,
  simularExito,
  listarMisPagos,
  listarHistorialArrendador,
  descargarComprobante,
  enviarNps,
  obtenerPublicKey,
  procesarPagoBricks,
  validarCupon,
};

/* ────────────────────────────────────────────────────────────────────────
 * Admin — desembolsos (ítem 368), reconciliación (ítem 370) y estado de pago
 * admin-only. Namespace separado a propósito: son operaciones ADMIN estricto
 * (`hasRole('ADMIN')` en `/api/v1/pagos/admin/**`), nada que ver con el flujo
 * self-service de arriba. Ver `DesembolsoController`/`PagoController` (G1/G5).
 * ──────────────────────────────────────────────────────────────────────── */

interface DesembolsoResponseDTO {
  id: number;
  arrendadorId: number;
  montoTotal: number;
  estado: EstadoDesembolso;
  metodoPago: string | null;
  referencia: string | null;
  motivoFallo: string | null;
  procesadoPor: number | null;
  fechaCreacion: string;
  fechaProcesado: string | null;
}

function fromDesembolsoDTO(dto: DesembolsoResponseDTO): Desembolso {
  return {
    id: dto.id,
    arrendadorId: dto.arrendadorId,
    montoTotal: Number(dto.montoTotal ?? 0),
    estado: dto.estado,
    metodoPago: dto.metodoPago,
    referencia: dto.referencia,
    motivoFallo: dto.motivoFallo,
    procesadoPor: dto.procesadoPor,
    fechaCreacion: dto.fechaCreacion,
    fechaProcesado: dto.fechaProcesado,
  };
}

export interface MarcarProcesadoPayload {
  metodoPago: string;
  referencia?: string;
}

export interface MarcarFallidoPayload {
  motivo: string;
}

/**
 * Saldo pendiente de desembolso por arrendador (ítem 368) — el backend serializa
 * `Map<Long, BigDecimal>` como objeto JSON; las claves llegan como string aunque
 * representen el `arrendadorId`.
 */
async function pendientesDesembolso(): Promise<Record<string, number>> {
  const { data } = await api.get<Record<string, number>>('/pagos/admin/desembolsos/pendientes');
  const out: Record<string, number> = {};
  for (const [arrendadorId, monto] of Object.entries(data)) {
    out[arrendadorId] = Number(monto);
  }
  return out;
}

/** Genera el desembolso PENDIENTE de un arrendador por su saldo actual. */
async function generarDesembolso(arrendadorId: string | number): Promise<Desembolso> {
  const { data } = await api.post<DesembolsoResponseDTO>(`/pagos/admin/desembolsos/${arrendadorId}/generar`);
  return fromDesembolsoDTO(data);
}

/** El admin confirma que ya transfirió (fuera de la plataforma) y anota la referencia. */
async function marcarDesembolsoProcesado(
  id: string | number,
  payload: MarcarProcesadoPayload,
): Promise<Desembolso> {
  const { data } = await api.post<DesembolsoResponseDTO>(
    `/pagos/admin/desembolsos/${id}/marcar-procesado`,
    payload,
  );
  return fromDesembolsoDTO(data);
}

/** La transferencia falló — el backend libera los pagos cubiertos para un próximo intento. */
async function marcarDesembolsoFallido(id: string | number, payload: MarcarFallidoPayload): Promise<Desembolso> {
  const { data } = await api.post<DesembolsoResponseDTO>(
    `/pagos/admin/desembolsos/${id}/marcar-fallido`,
    payload,
  );
  return fromDesembolsoDTO(data);
}

export interface ReconciliacionResumen {
  reservaId: number;
  escaneados: number;
  conciliados: number;
  sinCambio: number;
  revisionManual: number;
  fallidos: number;
}

/**
 * Ítem 370: re-consulta Mercado Pago y concilia los pagos en PENDIENTE_REVISION/DISCREPANCIA
 * de una reserva. Idempotente si no hay nada que conciliar (todos los contadores en 0).
 */
async function reconciliarReserva(reservaId: string | number): Promise<ReconciliacionResumen> {
  const { data } = await api.post<ReconciliacionResumen>(`/pagos/admin/reconciliar/${reservaId}`);
  return data;
}

/**
 * Ítem 370: estado del último pago de CUALQUIER reserva, sin el chequeo anti-IDOR de
 * `pagoService.getEstadoPago` (esa está restringida al estudiante dueño). Solo ADMIN.
 */
async function getEstadoPagoAdmin(reservaId: string | number): Promise<EstadoPagoResponse> {
  const { data } = await api.get<EstadoPagoResponse>(`/pagos/admin/reserva/${reservaId}/pago`);
  return data;
}

/** Fila del panel admin de pagos con problemas (ítem 351, reusada acá para el ítem 370). */
export interface PagoFallido {
  id: number;
  reservaId: number;
  estudianteId: number | null;
  arrendadorId: number | null;
  monto: number;
  estado: EstadoPago;
  fechaCreacion: string;
  fechaPago: string | null;
}

interface PagoFallidoDTO {
  id: number;
  reservaId: number;
  estudianteId: number | null;
  arrendadorId: number | null;
  monto: number;
  estado: EstadoPago;
  fechaCreacion: string;
  fechaPago: string | null;
}

function fromFallidoDTO(dto: PagoFallidoDTO): PagoFallido {
  return {
    id: dto.id,
    reservaId: dto.reservaId,
    estudianteId: dto.estudianteId,
    arrendadorId: dto.arrendadorId,
    monto: Number(dto.monto ?? 0),
    estado: dto.estado,
    fechaCreacion: dto.fechaCreacion,
    fechaPago: dto.fechaPago,
  };
}

/**
 * Ítem 351: pagos que requieren atención manual (RECHAZADO/DISCREPANCIA/PENDIENTE_REVISION).
 * La herramienta de reconciliación (ítem 370) la usa como atajo para no depender de que el
 * admin ya sepa de memoria qué `reservaId` está atascado.
 */
async function listarPagosFallidos(): Promise<PagoFallido[]> {
  const { data } = await api.get<PagoFallidoDTO[]>('/pagos/admin/fallidos');
  return data.map(fromFallidoDTO);
}

export const adminPagoService = {
  pendientesDesembolso,
  generarDesembolso,
  marcarDesembolsoProcesado,
  marcarDesembolsoFallido,
  reconciliarReserva,
  getEstadoPagoAdmin,
  listarPagosFallidos,
};
