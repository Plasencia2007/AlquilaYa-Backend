'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  adminModerationService,
  ConversacionAdmin,
  MensajeAdmin,
  EstadoConversacion,
} from '@/services/admin-moderation-service';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { Input } from '@/components/ui/legacy-input';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string) {
  if (!iso) return '---';
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Dialog genérico con input de motivo ─────────────────────────────────────

interface MotivoDialogProps {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
  loading: boolean;
}

function MotivoDialog({
  title, description, icon, iconColor, confirmLabel, confirmClass,
  onConfirm, onCancel, loading,
}: MotivoDialogProps) {
  const [motivo, setMotivo] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{description}</p>
          </div>
        </div>

        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
          Motivo
        </label>
        <textarea
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:border-slate-400 transition-colors"
          rows={3}
          placeholder="Describe el motivo de esta acción..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          autoFocus
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo)}
            disabled={loading || motivo.trim().length === 0}
            className={`flex-1 h-10 rounded-xl text-white text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Panel de mensajes ────────────────────────────────────────────────────────

interface MensajesPanelProps {
  conv: ConversacionAdmin;
  onClose: () => void;
}

function MensajesPanel({ conv, onClose }: MensajesPanelProps) {
  const [mensajes, setMensajes] = useState<MensajeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [bloquearTarget, setBloquearTarget] = useState<MensajeAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMensajes = useCallback(async () => {
    setLoading(true);
    try {
      const page = await adminModerationService.getMensajesAdmin(conv.id);
      setMensajes(page.content);
    } catch (err) {
      console.error('[MensajesPanel] Error:', err);
      showToast('Error al cargar mensajes', 'error');
    } finally {
      setLoading(false);
    }
  }, [conv.id]);

  useEffect(() => {
    loadMensajes();
  }, [loadMensajes]);

  const handleBloquear = async (motivo: string) => {
    if (!bloquearTarget) return;
    setActionLoading(bloquearTarget.id);
    try {
      await adminModerationService.bloquearMensaje(bloquearTarget.id, motivo);
      showToast('Mensaje bloqueado', 'success');
      setBloquearTarget(null);
      await loadMensajes();
    } catch {
      showToast('Error al bloquear mensaje', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDesbloquear = async (msg: MensajeAdmin) => {
    setActionLoading(msg.id);
    try {
      await adminModerationService.desbloquearMensaje(msg.id, 'Revisión de moderación');
      showToast('Mensaje desbloqueado', 'success');
      await loadMensajes();
    } catch {
      showToast('Error al desbloquear mensaje', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/30 backdrop-blur-sm">
      {bloquearTarget && (
        <MotivoDialog
          title="Bloquear mensaje"
          description={`Mensaje de ${bloquearTarget.remitenteNombre}`}
          icon="block"
          iconColor="bg-red-50 text-red-500"
          confirmLabel="Bloquear"
          confirmClass="bg-red-500 hover:bg-red-600"
          onConfirm={handleBloquear}
          onCancel={() => setBloquearTarget(null)}
          loading={actionLoading === bloquearTarget.id}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-xs font-bold uppercase tracking-widest ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="bg-white h-full w-full max-w-lg shadow-2xl flex flex-col">
        {/* Panel header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Mensajes — Conv. #{conv.id}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {conv.participantes?.map((p) => p.nombre).join(' · ') || 'Participantes desconocidos'}
            </p>
            {conv.propiedadTitulo && (
              <p className="text-[9px] font-medium text-slate-300 mt-0.5">{conv.propiedadTitulo}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-slate-600 transition-colors mt-0.5"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Lista de mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Cargando mensajes...
              </span>
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="material-symbols-outlined text-slate-200 text-4xl">chat_bubble</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                Sin mensajes
              </span>
            </div>
          ) : (
            mensajes.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl border p-4 transition-colors ${
                  msg.estado === 'BLOQUEADO'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                        {msg.remitenteNombre}
                      </span>
                      {msg.estado === 'BLOQUEADO' && (
                        <Badge variant="error">Bloqueado</Badge>
                      )}
                    </div>
                    <p
                      className={`text-xs font-medium leading-relaxed break-words ${
                        msg.estado === 'BLOQUEADO' ? 'text-red-400 italic' : 'text-slate-700'
                      }`}
                    >
                      {msg.estado === 'BLOQUEADO' ? '[Mensaje bloqueado por moderación]' : msg.contenido}
                    </p>
                    {msg.motivoBloqueo && (
                      <p className="text-[9px] text-red-400 font-medium mt-1">
                        Motivo: {msg.motivoBloqueo}
                      </p>
                    )}
                    <p className="text-[9px] text-slate-300 font-medium mt-2">
                      {formatFecha(msg.fechaEnvio)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {msg.estado === 'BLOQUEADO' ? (
                      <button
                        onClick={() => handleDesbloquear(msg)}
                        disabled={actionLoading !== null}
                        className="text-slate-300 hover:text-green-500 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                        title="Desbloquear mensaje"
                      >
                        {actionLoading === msg.id ? (
                          <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-base">lock_open</span>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => setBloquearTarget(msg)}
                        disabled={actionLoading !== null}
                        className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                        title="Bloquear mensaje"
                      >
                        <span className="material-symbols-outlined text-base">block</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
            {mensajes.length} mensaje{mensajes.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={loadMensajes}
            disabled={loading}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Recargar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

type DialogAction =
  | { type: 'suspender'; conv: ConversacionAdmin }
  | { type: 'reactivar'; conv: ConversacionAdmin }
  | null;

export default function AdminModeracionMensajeriaPage() {
  const [conversaciones, setConversaciones] = useState<ConversacionAdmin[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState<EstadoConversacion | ''>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogAction>(null);
  const [mensajesConv, setMensajesConv] = useState<ConversacionAdmin | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const PAGE_SIZE = 20;

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadConversaciones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminModerationService.getConversaciones({
        page,
        size: PAGE_SIZE,
        estado: filtroEstado,
      });
      setConversaciones(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err) {
      console.error('[AdminModeracion] Error cargando conversaciones:', err);
      showToast('Error al cargar conversaciones', 'error');
      setConversaciones([]);
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado]);

  useEffect(() => {
    loadConversaciones();
  }, [loadConversaciones]);

  const handleSuspender = async (motivo: string) => {
    if (!dialog || dialog.type !== 'suspender') return;
    const { conv } = dialog;
    setActionLoading(conv.id);
    try {
      await adminModerationService.suspenderConversacion(conv.id, motivo);
      showToast(`Conversación #${conv.id} suspendida`, 'success');
      setDialog(null);
      await loadConversaciones();
    } catch {
      showToast('Error al suspender conversación', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivar = async (motivo: string) => {
    if (!dialog || dialog.type !== 'reactivar') return;
    const { conv } = dialog;
    setActionLoading(conv.id);
    try {
      await adminModerationService.reactivarConversacion(conv.id, motivo);
      showToast(`Conversación #${conv.id} reactivada`, 'success');
      setDialog(null);
      await loadConversaciones();
    } catch {
      showToast('Error al reactivar conversación', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFiltroChange = (estado: EstadoConversacion | '') => {
    setFiltroEstado(estado);
    setPage(0);
  };

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-xs font-bold uppercase tracking-widest transition-all ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Dialog suspender */}
      {dialog?.type === 'suspender' && (
        <MotivoDialog
          title="Suspender conversación"
          description={`Conv. #${dialog.conv.id}`}
          icon="pause_circle"
          iconColor="bg-amber-50 text-amber-500"
          confirmLabel="Suspender"
          confirmClass="bg-amber-500 hover:bg-amber-600"
          onConfirm={handleSuspender}
          onCancel={() => setDialog(null)}
          loading={actionLoading === dialog.conv.id}
        />
      )}

      {/* Dialog reactivar */}
      {dialog?.type === 'reactivar' && (
        <MotivoDialog
          title="Reactivar conversación"
          description={`Conv. #${dialog.conv.id}`}
          icon="play_circle"
          iconColor="bg-green-50 text-green-500"
          confirmLabel="Reactivar"
          confirmClass="bg-green-500 hover:bg-green-600"
          onConfirm={handleReactivar}
          onCancel={() => setDialog(null)}
          loading={actionLoading === dialog.conv.id}
        />
      )}

      {/* Panel de mensajes */}
      {mensajesConv && (
        <MensajesPanel conv={mensajesConv} onClose={() => setMensajesConv(null)} />
      )}

      <Card padding="none" className="border border-slate-200 bg-white shadow-none rounded-xl overflow-hidden mb-6">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="material-symbols-outlined text-blue-500 text-2xl">forum</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Moderación de Mensajería</h2>
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                Supervisión de conversaciones entre usuarios · {totalElements} conversaciones
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Filtro de estado */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                {(['', 'ACTIVA', 'SUSPENDIDA'] as (EstadoConversacion | '')[]).map((estado) => (
                  <button
                    key={estado}
                    onClick={() => handleFiltroChange(estado)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${
                      filtroEstado === estado
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {estado === '' ? 'Todas' : estado === 'ACTIVA' ? 'Activas' : 'Suspendidas'}
                  </button>
                ))}
              </div>
              <button
                onClick={loadConversaciones}
                disabled={loading}
                className="h-10 px-4 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 uppercase text-[9px] font-black tracking-widest bg-slate-50/50">
                <th className="py-4 px-8 border-b border-slate-100">ID</th>
                <th className="py-4 px-8 border-b border-slate-100">Participantes</th>
                <th className="py-4 px-8 border-b border-slate-100">Propiedad</th>
                <th className="py-4 px-8 border-b border-slate-100">Estado</th>
                <th className="py-4 px-8 border-b border-slate-100">Última actividad</th>
                <th className="py-4 px-8 border-b border-slate-100 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                      Cargando conversaciones...
                    </span>
                  </td>
                </tr>
              ) : conversaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-slate-200 text-4xl">forum</span>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        Sin conversaciones
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                conversaciones.map((conv) => (
                  <tr key={conv.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-8">
                      <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded-md">
                        #{conv.id}
                      </span>
                    </td>
                    <td className="py-4 px-8">
                      <div className="flex flex-col gap-0.5">
                        {(conv.participantes || []).map((p) => (
                          <div key={p.id} className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-300 border border-slate-100 px-1.5 py-0.5 rounded">
                              {p.rol}
                            </span>
                            <span className="text-[11px] font-medium text-slate-600">{p.nombre}</span>
                          </div>
                        ))}
                        {(!conv.participantes || conv.participantes.length === 0) && (
                          <span className="text-[10px] text-slate-300 italic">Sin datos</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-8">
                      <span className="text-[11px] font-medium text-slate-500">
                        {conv.propiedadTitulo || `Propiedad #${conv.propiedadId || '---'}`}
                      </span>
                    </td>
                    <td className="py-4 px-8">
                      {conv.estado === 'ACTIVA' ? (
                        <Badge variant="success">Activa</Badge>
                      ) : (
                        <Badge variant="error">Suspendida</Badge>
                      )}
                    </td>
                    <td className="py-4 px-8">
                      <span className="text-[11px] font-medium text-slate-400">
                        {formatFecha(conv.ultimaActividad)}
                      </span>
                    </td>
                    <td className="py-4 px-8 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Ver mensajes */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMensajesConv(conv)}
                          className="text-slate-300 hover:text-blue-500 p-2 h-auto rounded-md"
                          title="Ver mensajes"
                        >
                          <span className="material-symbols-outlined text-lg">chat_bubble</span>
                        </Button>

                        {/* Suspender / Reactivar */}
                        {conv.estado === 'ACTIVA' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDialog({ type: 'suspender', conv })}
                            disabled={actionLoading !== null}
                            className="text-slate-300 hover:text-amber-500 p-2 h-auto rounded-md"
                            title="Suspender conversación"
                          >
                            {actionLoading === conv.id ? (
                              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-lg">pause_circle</span>
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDialog({ type: 'reactivar', conv })}
                            disabled={actionLoading !== null}
                            className="text-slate-300 hover:text-green-500 p-2 h-auto rounded-md"
                            title="Reactivar conversación"
                          >
                            {actionLoading === conv.id ? (
                              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-lg">play_circle</span>
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    disabled={loading}
                    className={`h-8 w-8 rounded-lg text-[11px] font-black transition-colors disabled:opacity-50 ${
                      pageNum === page
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
