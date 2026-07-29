'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

import {
  ShieldAlert, CheckCircle, XCircle, ExternalLink, X,
  Star, Calendar, AlertTriangle, Trash2, Shield,
  Clock, ChevronRight, FileText, ZoomIn,
} from 'lucide-react';
import { adminModerationService, DocumentoAdmin } from '@/services/admin-moderation-service';
import { usuarioMasterService, UsuarioMaster } from '@/services/admin-user-service';
import { auditLogService, AuditLogEntry } from '@/services/audit-log-service';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { esImagenExterna } from '@/lib/img';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useTabParam } from '@/hooks/use-tab-param';
import { UserDirectoryTable } from '@/components/admin/UserDirectoryTable';
import { Skeleton } from '@/components/ui/skeleton';

// `react-pdf`/`pdfjs-dist` usan `canvas` (no existe en Node) → solo cliente (ssr:false),
// mismo patrón que `components/student/contract-actions.tsx` (worker pineado por CDN a la
// versión exacta que trae `pdfjs-dist`, recomendado por el propio `react-pdf`).
const PdfDocument = dynamic(
  () =>
    import('react-pdf').then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
      return mod.Document;
    }),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);
const PdfPage = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

// ─── Tipos locales ─────────────────────────────────────────────────────────────
type Tab = 'directorio' | 'gestion' | 'documentos' | 'historial';
type EstadoFiltro = 'ALL' | 'ACTIVE' | 'PENDING' | 'BANNED';

const TAB_VALUES: readonly Tab[] = ['directorio', 'gestion', 'documentos', 'historial'];

/** ítem 364: acciones de auditoría relevantes para ESTE módulo (arrendadores). `AuditLog` no
 *  guarda el rol del usuario afectado, así que se filtra client-side por las acciones que las
 *  tabs Gestión/Documentos de esta pantalla efectivamente disparan (ver `UsuarioController` y
 *  `DocumentoController` en servicio-usuarios). */
const ACCIONES_PROVEEDORES = ['VERIFICAR_DOCUMENTO', 'CAMBIO_ESTADO_USUARIO', 'ELIMINAR_USUARIO'];

/** Traducción legible de `AuditLog.accion` para el tab Historial. */
const ACCION_LABEL: Record<string, string> = {
  VERIFICAR_DOCUMENTO: 'Verificó un documento',
  CAMBIO_ESTADO_USUARIO: 'Cambió el estado de una cuenta',
  ELIMINAR_USUARIO: 'Eliminó una cuenta',
};

/** true si la URL apunta a un PDF (por extensión o querystring, p.ej. Cloudinary `.../doc.pdf`). */
function esPdf(url: string): boolean {
  return /\.pdf($|\?)/i.test(url);
}

interface ToastItem { id: number; message: string; type: 'success' | 'error'; }
interface ConfirmActionState {
  type: 'ban' | 'activate' | 'delete';
  user: UsuarioMaster;
}
interface PropiedadCount { activas: number; total: number; }

// ─── Toast system ──────────────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-6 right-6 z-[200] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-bold pointer-events-auto',
            'animate-in fade-in slide-in-from-right duration-300 border',
            t.type === 'success'
              ? 'bg-green-500 text-white border-green-600'
              : 'bg-red-500 text-white border-red-600'
          )}
        >
          {t.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {t.message}
          <button onClick={() => onRemove(t.id)} className="ml-1 opacity-70 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, addToast, removeToast };
}

// ─── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel, variant, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void; onCancel: () => void;
}) {
  const mounted = useHasMounted();
  // Ítem 396: focus trap básico — este modal es un `createPortal` a mano, no un
  // `Dialog` de Radix, así que no atrapa foco por su cuenta.
  const trapRef = useFocusTrap<HTMLDivElement>({ onEscape: onCancel });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        tabIndex={-1}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in slide-in-from-bottom-2 duration-400"
      >
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center mb-4',
          variant === 'danger' ? 'bg-red-50' : 'bg-orange-50'
        )}>
          <AlertTriangle size={22} className={variant === 'danger' ? 'text-red-500' : 'text-orange-500'} />
        </div>
        <h3 id="confirm-modal-title" className="text-base font-black text-slate-900 tracking-tight mb-1">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-white text-sm font-black transition-all',
              variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Reject modal ──────────────────────────────────────────────────────────────
function RejectModal({ onConfirm, onCancel }: { onConfirm: (motivo: string) => void; onCancel: () => void }) {
  const [motivo, setMotivo] = useState('');
  const mounted = useHasMounted();
  const trapRef = useFocusTrap<HTMLDivElement>({ onEscape: onCancel });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
        tabIndex={-1}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in slide-in-from-bottom-2 duration-400"
      >
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <XCircle size={22} className="text-red-500" />
        </div>
        <h3 id="reject-modal-title" className="text-base font-black text-slate-900 tracking-tight mb-1">Rechazar documento</h3>
        <p className="text-sm text-slate-500 mb-4">Indica el motivo para que el usuario pueda corregirlo.</p>
        <textarea
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder="Ej: La imagen está borrosa, se requiere una foto más clara del documento..."
          rows={3}
          maxLength={300}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-red-300 resize-none mb-1"
        />
        <p className="text-[10px] text-slate-300 text-right mb-4">{motivo.length}/300</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">
            Cancelar
          </button>
          <button
            onClick={() => motivo.trim() && onConfirm(motivo.trim())}
            disabled={!motivo.trim()}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-black transition-all disabled:opacity-40"
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, bg, text, border }: {
  label: string; value: number; icon: string;
  bg: string; text: string; border: string;
}) {
  return (
    <div className={cn('rounded-2xl p-5 border flex items-center gap-4 bg-white', border)}>
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
        <span className={cn('material-symbols-outlined text-[20px]', text)}>{icon}</span>
      </div>
      <div>
        <p className={cn('text-3xl font-black tracking-tighter leading-none', text)}>{value}</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Stars rating ──────────────────────────────────────────────────────────────
function StarsRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={11}
          className={i <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}
        />
      ))}
    </div>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 'sm' }: { user: UsuarioMaster; size?: 'sm' | 'lg' }) {
  const initials = `${user.nombre?.[0] ?? ''}${user.apellido?.[0] ?? ''}`.toUpperCase();
  const cls = size === 'lg'
    ? 'w-20 h-20 rounded-full border-2 border-white/10 shadow-xl text-2xl font-black'
    : 'w-9 h-9 rounded-xl text-[11px] font-black';
  const px = size === 'lg' ? 80 : 36;

  if (user.fotoUrl) {
    return (
      <Image
        src={user.fotoUrl}
        alt={`${user.nombre} ${user.apellido}`}
        width={px}
        height={px}
        unoptimized={esImagenExterna(user.fotoUrl)}
        className={cn(cls, 'object-cover')}
      />
    );
  }
  return (
    <div className={cn(cls, 'flex items-center justify-center', size === 'lg' ? 'bg-gradient-to-br from-slate-600 to-slate-800 text-white' : 'bg-primary/10 text-primary')}>
      {initials}
    </div>
  );
}

// ─── Estado badge ──────────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'ACTIVE') return <span className="text-[10px] font-black bg-green-50 text-green-600 border border-green-100 px-2.5 py-1 rounded-full">Activo</span>;
  if (estado === 'PENDING') return <span className="text-[10px] font-black bg-yellow-50 text-yellow-600 border border-yellow-100 px-2.5 py-1 rounded-full">Pendiente</span>;
  return <span className="text-[10px] font-black bg-red-50 text-red-500 border border-red-100 px-2.5 py-1 rounded-full">Baneado</span>;
}

// ─── Drawer lateral ───────────────────────────────────────────────────────────
function ProveedorDrawer({
  user, onClose, onBan, onActivate, onDelete,
}: {
  user: UsuarioMaster;
  onClose: () => void;
  onBan: (user: UsuarioMaster) => void;
  onActivate: (user: UsuarioMaster) => void;
  onDelete: (user: UsuarioMaster) => void;
}) {
  const [propCount, setPropCount] = useState<PropiedadCount | null>(null);
  // Arranca en `true` cuando ya sabemos que el efecto va a lanzar el fetch (evita
  // tener que poner setLoadingProps(true) síncrono dentro del efecto, que viola
  // react-hooks/set-state-in-effect). El drawer se remonta por `key={user.id}`
  // en el padre, así este estado inicial siempre corresponde al `user` correcto.
  const [loadingProps, setLoadingProps] = useState(() => !!user.perfilArrendadorId);
  const mounted = useHasMounted();
  const trapRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose });

  useEffect(() => {
    if (!user.perfilArrendadorId) return;
    api.get<{ id: number; estado: string }[]>(`propiedades/arrendador/${user.perfilArrendadorId}`)
      .then(res => {
        const all = Array.isArray(res.data) ? res.data : [];
        setPropCount({
          activas: all.filter(p => p.estado === 'APROBADO').length,
          total: all.length,
        });
      })
      .catch(() => setPropCount({ activas: 0, total: 0 }))
      .finally(() => setLoadingProps(false));
  }, [user.perfilArrendadorId]);

  const calStr = user.calificacion != null ? user.calificacion.toFixed(1) : null;
  const fechaStr = user.fechaCreacion
    ? new Date(user.fechaCreacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
    : '---';

  if (!mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in slide-in-from-bottom-2 duration-400" onClick={onClose} />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="proveedor-drawer-title"
        tabIndex={-1}
        className="fixed right-0 top-0 h-full w-[380px] bg-[#0f172a] border-l border-white/10 z-50 flex flex-col shadow-2xl animate-in fade-in slide-in-from-right duration-300 overflow-y-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 id="proveedor-drawer-title" className="text-white font-black tracking-tight text-sm">Detalle del proveedor</h2>
          <button onClick={onClose} aria-label="Cerrar detalle del proveedor" className="w-11 h-11 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white transition-all">
            <X size={15} />
          </button>
        </div>

        {/* Avatar + info principal */}
        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
          <Avatar user={user} size="lg" />
          <h3 className="text-white text-lg font-black capitalize mt-4">{user.nombre} {user.apellido}</h3>
          {user.nombreComercial && (
            <p className="text-white/50 text-xs mt-0.5 font-medium">{user.nombreComercial}</p>
          )}
          <p className="text-white/40 text-xs mt-1">{user.correo}</p>
          <div className="mt-3">
            {user.estado === 'ACTIVE' && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-green-500/20 text-green-400 px-3 py-1 rounded-full uppercase tracking-widest border border-green-500/20">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Activo
              </span>
            )}
            {user.estado === 'PENDING' && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full uppercase tracking-widest border border-yellow-500/20">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" /> Pendiente
              </span>
            )}
            {user.estado === 'BANNED' && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-red-500/20 text-red-400 px-3 py-1 rounded-full uppercase tracking-widest border border-red-500/20">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full" /> Baneado
              </span>
            )}
          </div>
        </div>

        {/* Datos */}
        <div className="p-5 space-y-1 flex-1">
          {/* DNI */}
          <div className="flex items-center gap-3 py-3 border-b border-white/5">
            <span className="material-symbols-outlined text-[18px] text-white/20 w-5 text-center flex-shrink-0">badge</span>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[11px] text-white/40">DNI</p>
              <p className="text-white text-sm font-bold">{user.dni || '---'}</p>
            </div>
          </div>
          {/* Teléfono */}
          <div className="flex items-center gap-3 py-3 border-b border-white/5">
            <span className="material-symbols-outlined text-[18px] text-white/20 w-5 text-center flex-shrink-0">phone</span>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[11px] text-white/40">Teléfono</p>
              <p className="text-white text-sm font-bold">{user.telefono || '---'}</p>
            </div>
          </div>
          {/* WhatsApp */}
          <div className="flex items-center gap-3 py-3 border-b border-white/5">
            <span className="material-symbols-outlined text-[18px] text-white/20 w-5 text-center flex-shrink-0">phone_iphone</span>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[11px] text-white/40">WhatsApp</p>
              <span className={cn(
                'text-sm font-bold',
                user.telefonoVerificado ? 'text-green-400' : 'text-white/40'
              )}>
                {user.telefonoVerificado ? '✓ Verificado' : 'Pendiente'}
              </span>
            </div>
          </div>
          {/* Propiedades */}
          <div className="flex items-center gap-3 py-3 border-b border-white/5">
            <span className="material-symbols-outlined text-[18px] text-white/20 w-5 text-center flex-shrink-0">home_work</span>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[11px] text-white/40">Propiedades activas</p>
              {loadingProps ? (
                <span className="text-[11px] text-white/20 animate-pulse">Cargando...</span>
              ) : propCount ? (
                <p className="text-white text-sm font-bold">
                  {propCount.activas}
                  <span className="text-white/30 text-xs font-medium"> / {propCount.total}</span>
                </p>
              ) : (
                <p className="text-white/30 text-sm font-bold">---</p>
              )}
            </div>
          </div>
          {/* Calificación */}
          <div className="flex items-center gap-3 py-3 border-b border-white/5">
            <span className="material-symbols-outlined text-[18px] text-white/20 w-5 text-center flex-shrink-0">star</span>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[11px] text-white/40">Calificación promedio</p>
              {calStr ? (
                <div className="flex items-center gap-2">
                  <StarsRating value={user.calificacion!} />
                  <span className="text-yellow-400 text-sm font-bold">{calStr}</span>
                </div>
              ) : (
                <p className="text-white/30 text-sm font-bold">---</p>
              )}
            </div>
          </div>
          {/* Fecha */}
          <div className="flex items-center gap-3 py-3">
            <span className="material-symbols-outlined text-[18px] text-white/20 w-5 text-center flex-shrink-0">calendar_today</span>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[11px] text-white/40">Fecha de registro</p>
              <p className="text-white text-sm font-bold">{fechaStr}</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="p-5 border-t border-white/10 space-y-2.5">
          {user.estado === 'BANNED' ? (
            <button
              onClick={() => onActivate(user)}
              className="w-full py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-black hover:bg-green-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Shield size={15} /> Restaurar acceso
            </button>
          ) : (
            <button
              onClick={() => onBan(user)}
              className="w-full py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-black hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[15px]">block</span> Banear proveedor
            </button>
          )}
          <button
            onClick={() => onDelete(user)}
            className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-black hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={15} /> Eliminar cuenta
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Tab Gestión ──────────────────────────────────────────────────────────────
function TabGestion() {
  const [users, setUsers] = useState<UsuarioMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('ALL');
  const [selectedUser, setSelectedUser] = useState<UsuarioMaster | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  const { toasts, addToast, removeToast } = useToasts();

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await usuarioMasterService.obtenerArrendadoresAdmin();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const ejecutarAccion = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    setConfirmAction(null);
    setSelectedUser(null);
    const nombre = `${user.nombre} ${user.apellido}`;
    try {
      if (type === 'ban') {
        await usuarioMasterService.banearUsuario(user.id);
        addToast(`${nombre} fue baneado`, 'success');
      } else if (type === 'activate') {
        await usuarioMasterService.activarUsuario(user.id);
        addToast(`Acceso restaurado a ${nombre}`, 'success');
      } else if (type === 'delete') {
        await usuarioMasterService.eliminarUsuario(user.id);
        addToast(`${nombre} fue eliminado`, 'success');
      }
      cargar();
    } catch {
      addToast('Error al ejecutar la acción', 'error');
    }
  };

  const total = users.length;
  const activos = users.filter(u => u.estado === 'ACTIVE').length;
  const pendientes = users.filter(u => u.estado === 'PENDING').length;
  const baneados = users.filter(u => u.estado === 'BANNED').length;

  const filtrados = users.filter(u => {
    const matchEstado = filtroEstado === 'ALL' || u.estado === filtroEstado;
    const matchSearch = !search ||
      u.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      u.apellido?.toLowerCase().includes(search.toLowerCase()) ||
      u.correo?.toLowerCase().includes(search.toLowerCase()) ||
      u.dni?.includes(search);
    return matchEstado && matchSearch;
  });

  const CHIPS: { label: string; value: EstadoFiltro; count: number; active: string; inactive: string }[] = [
    { label: 'Todos', value: 'ALL', count: total, active: 'bg-slate-800 text-white border-slate-800', inactive: 'bg-white text-slate-500 border-slate-200 hover:border-slate-300' },
    { label: 'Activos', value: 'ACTIVE', count: activos, active: 'bg-green-500 text-white border-green-500', inactive: 'bg-white text-slate-500 border-slate-200 hover:border-green-300 hover:text-green-600' },
    { label: 'Pendientes', value: 'PENDING', count: pendientes, active: 'bg-yellow-500 text-white border-yellow-500', inactive: 'bg-white text-slate-500 border-slate-200 hover:border-yellow-300 hover:text-yellow-600' },
    { label: 'Baneados', value: 'BANNED', count: baneados, active: 'bg-red-500 text-white border-red-500', inactive: 'bg-white text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-600' },
  ];

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Confirm modal */}
      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.type === 'ban' ? 'Banear proveedor' :
            confirmAction.type === 'activate' ? 'Restaurar acceso' :
            'Eliminar cuenta permanentemente'
          }
          message={
            confirmAction.type === 'ban'
              ? `¿Confirmas banear a ${confirmAction.user.nombre} ${confirmAction.user.apellido}? No podrá iniciar sesión.`
              : confirmAction.type === 'activate'
              ? `¿Restaurar el acceso de ${confirmAction.user.nombre} ${confirmAction.user.apellido}?`
              : `¿Eliminar PERMANENTEMENTE la cuenta de ${confirmAction.user.nombre} ${confirmAction.user.apellido}? Esta acción no se puede deshacer.`
          }
          confirmLabel={
            confirmAction.type === 'ban' ? 'Banear' :
            confirmAction.type === 'activate' ? 'Restaurar' :
            'Eliminar'
          }
          variant={confirmAction.type === 'delete' ? 'danger' : 'warning'}
          onConfirm={ejecutarAccion}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={total} icon="groups" bg="bg-slate-100" text="text-slate-700" border="border-slate-200" />
        <StatCard label="Activos" value={activos} icon="check_circle" bg="bg-green-50" text="text-green-600" border="border-green-100" />
        <StatCard label="Pendientes" value={pendientes} icon="pending" bg="bg-yellow-50" text="text-yellow-600" border="border-yellow-100" />
        <StatCard label="Baneados" value={baneados} icon="block" bg="bg-red-50" text="text-red-500" border="border-red-100" />
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {CHIPS.map(chip => (
              <button
                key={chip.value}
                onClick={() => setFiltroEstado(chip.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border transition-all',
                  filtroEstado === chip.value ? chip.active : chip.inactive
                )}
              >
                {chip.label} <span className="opacity-70">({chip.count})</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[18px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nombre, correo o DNI..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-primary/50 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100 bg-slate-50/40">
                <th className="py-3 px-6">Proveedor</th>
                <th className="py-3 px-6">Identidad</th>
                <th className="py-3 px-6">Estado</th>
                <th className="py-3 px-6">WhatsApp</th>
                <th className="py-3 px-6">Calificación</th>
                <th className="py-3 px-6">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 animate-pulse">Cargando proveedores...</span>
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Sin resultados</span>
                  </td>
                </tr>
              ) : filtrados.map(user => {
                const fecha = user.fechaCreacion
                  ? new Date(user.fechaCreacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })
                  : '---';
                return (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size="sm" />
                        <div>
                          <p className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">
                            {user.nombre} {user.apellido}
                          </p>
                          <p className="text-[10px] text-slate-400">{user.correo}</p>
                          {user.nombreComercial && (
                            <p className="text-[10px] text-primary/60 font-medium">{user.nombreComercial}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] font-bold text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">
                        DNI {user.dni || '---'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <EstadoBadge estado={user.estado} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('w-1.5 h-1.5 rounded-full', user.telefonoVerificado ? 'bg-green-500' : 'bg-slate-300')} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {user.telefonoVerificado ? 'Verificado' : 'Pendiente'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {user.calificacion != null ? (
                        <div className="space-y-0.5">
                          <StarsRating value={user.calificacion} />
                          <span className="text-[10px] font-bold text-slate-500">{user.calificacion.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-300">---</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar size={11} />
                        <span className="text-[11px] font-bold">{fecha}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <ProveedorDrawer
          key={selectedUser.id}
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onBan={user => { setSelectedUser(null); setConfirmAction({ type: 'ban', user }); }}
          onActivate={user => { setSelectedUser(null); setConfirmAction({ type: 'activate', user }); }}
          onDelete={user => { setSelectedUser(null); setConfirmAction({ type: 'delete', user }); }}
        />
      )}
    </div>
  );
}

// ─── Preview de documento KYC (ítem 388) ───────────────────────────────────────
/**
 * Lightbox del documento subido, lado a lado con los datos declarados por el usuario para
 * que el admin pueda compararlos visualmente antes de aprobar/rechazar. Imágenes usan zoom
 * (`react-medium-image-zoom`); PDFs se paginan con `react-pdf` (mismo patrón que
 * `components/student/contract-actions.tsx`).
 */
function DocumentoPreviewModal({ doc, onClose }: { doc: DocumentoAdmin; onClose: () => void }) {
  const mounted = useHasMounted();
  const [numPages, setNumPages] = useState<number | null>(null);
  const pdf = doc.urlDocumento ? esPdf(doc.urlDocumento) : false;
  const trapRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Documento: ${doc.tipoDocumento} de ${doc.nombreUsuario}`}
        tabIndex={-1}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        {/* Documento */}
        <div className="flex-1 min-w-0 bg-slate-50 overflow-auto flex items-center justify-center p-4 md:p-6">
          {!doc.urlDocumento ? (
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Sin archivo</span>
          ) : pdf ? (
            <PdfDocument
              file={doc.urlDocumento}
              loading={<Skeleton className="h-72 w-full rounded-lg" />}
              error={<p className="p-6 text-center text-sm text-red-500">No se pudo mostrar el PDF.</p>}
              onLoadSuccess={(pdfDoc) => setNumPages(pdfDoc.numPages)}
            >
              {Array.from({ length: numPages ?? 0 }, (_, i) => (
                <PdfPage
                  key={i + 1}
                  pageNumber={i + 1}
                  width={520}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="mb-3 shadow last:mb-0"
                />
              ))}
            </PdfDocument>
          ) : (
            <Zoom>
              {/* eslint-disable-next-line @next/next/no-img-element -- react-medium-image-zoom clona un <img> nativo */}
              <img
                src={doc.urlDocumento}
                alt={`${doc.tipoDocumento} de ${doc.nombreUsuario}`}
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
              />
            </Zoom>
          )}
        </div>

        {/* Datos declarados por el usuario, para comparar contra el documento */}
        <div className="flex w-full shrink-0 flex-col border-t border-slate-200 p-6 md:w-72 md:border-l md:border-t-0">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-sm font-black tracking-tight text-slate-900">Datos declarados</h3>
            <button
              onClick={onClose}
              aria-label="Cerrar visor de documento"
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all hover:bg-slate-200"
            >
              <X size={15} />
            </button>
          </div>
          <dl className="flex-1 space-y-4 text-sm">
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre</dt>
              <dd className="mt-0.5 font-bold text-slate-800">{doc.nombreUsuario} {doc.apellidoUsuario}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correo</dt>
              <dd className="mt-0.5 break-all font-bold text-slate-800">{doc.correoUsuario}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de documento</dt>
              <dd className="mt-0.5 font-bold text-slate-800">{doc.tipoDocumento.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enviado</dt>
              <dd className="mt-0.5 font-bold text-slate-800">
                {doc.fechaSubida
                  ? new Date(doc.fechaSubida).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '---'}
              </dd>
            </div>
          </dl>
          {doc.urlDocumento && (
            <a
              href={doc.urlDocumento}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-slate-500 transition-colors hover:text-slate-800"
            >
              <ExternalLink size={12} /> Abrir original en pestaña nueva
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Tab Documentos ───────────────────────────────────────────────────────────
function TabDocumentos() {
  const [documentos, setDocumentos] = useState<DocumentoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verificandoId, setVerificandoId] = useState<number | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentoAdmin | null>(null);
  const { toasts, addToast, removeToast } = useToasts();

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await adminModerationService.getDocumentosPendientes();
      setDocumentos(Array.isArray(data) ? data : []);
    } catch {
      setDocumentos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleVerify = async (id: number, estado: 'APROBADO' | 'RECHAZADO', comentario = '') => {
    setVerificandoId(id);
    const doc = documentos.find(d => d.id === id);
    const nombreUsuario = doc ? `${doc.nombreUsuario} ${doc.apellidoUsuario}` : 'usuario';
    try {
      await adminModerationService.verificarDocumento(id, estado, comentario);
      setDocumentos(prev => prev.filter(d => d.id !== id));
      if (estado === 'APROBADO') {
        addToast(`Documento de ${nombreUsuario} aprobado`, 'success');
      } else {
        addToast(`Documento de ${nombreUsuario} rechazado`, 'success');
      }
    } catch {
      addToast('Error al verificar el documento', 'error');
    } finally {
      setVerificandoId(null);
      setRejectTargetId(null);
    }
  };

  if (cargando) return (
    <div className="py-20 text-center">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 animate-pulse">Cargando documentos...</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {rejectTargetId !== null && (
        <RejectModal
          onConfirm={motivo => handleVerify(rejectTargetId, 'RECHAZADO', motivo)}
          onCancel={() => setRejectTargetId(null)}
        />
      )}

      {previewDoc && (
        <DocumentoPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {documentos.length === 0 ? (
        <div className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-[1.5rem]">
          <ShieldAlert size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No hay documentos pendientes</p>
          <p className="text-slate-300 text-xs mt-2 font-medium">Todos los documentos han sido revisados</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">
              <span className="text-slate-900 font-black">{documentos.length}</span> documentos pendientes de revisión
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {documentos.map(doc => (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-[1.5rem] p-5 hover:shadow-lg hover:shadow-slate-100 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <ShieldAlert size={20} className="text-primary" />
                  </div>
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">
                    {doc.tipoDocumento.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="text-slate-900 font-black truncate">{doc.nombreUsuario} {doc.apellidoUsuario}</h3>
                <p className="text-slate-400 text-xs mb-4">{doc.correoUsuario}</p>

                {/* Previsualización del documento (clic abre el visor con zoom/PDF, ítem 388). */}
                {doc.urlDocumento ? (
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="group/img relative mb-4 block aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {esPdf(doc.urlDocumento) ? (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                        <FileText size={32} className="text-slate-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Documento PDF</span>
                      </span>
                    ) : (
                      <Image
                        src={doc.urlDocumento}
                        alt={`${doc.tipoDocumento} de ${doc.nombreUsuario}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        unoptimized={esImagenExterna(doc.urlDocumento)}
                        className="object-contain transition-transform group-hover/img:scale-105"
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover/img:bg-black/20">
                      <span className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover/img:opacity-100">
                        <ZoomIn size={11} /> Ver documento
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 aspect-[16/10] flex items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Sin imagen</span>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Enviado</span>
                    <span className="text-slate-700 font-bold">
                      {doc.fechaSubida
                        ? new Date(doc.fechaSubida).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '---'}
                    </span>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-2">
                  {doc.urlDocumento && (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-[11px] font-bold rounded-xl hover:bg-black transition-all"
                    >
                      <ZoomIn size={13} /> Ver documento
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerify(doc.id, 'APROBADO')}
                      disabled={verificandoId === doc.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-green-500 text-white text-[11px] font-black rounded-xl hover:bg-green-600 transition-all disabled:opacity-40"
                    >
                      <CheckCircle size={13} /> Aprobar
                    </button>
                    <button
                      onClick={() => setRejectTargetId(doc.id)}
                      disabled={verificandoId === doc.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-white border border-red-300 text-red-500 text-[11px] font-black rounded-xl hover:bg-red-50 transition-all disabled:opacity-40"
                    >
                      <XCircle size={13} /> Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab Historial ─────────────────────────────────────────────────────────────
/**
 * Ítem 364: historial persistente — reemplaza el estado en memoria (que se perdía al
 * recargar) por un fetch paginado a `AuditLogController` (el mismo endpoint que consume
 * system/audit para la vista general, ítem 365). `AuditLog` no guarda el rol del usuario
 * afectado, así que se filtra client-side a las acciones que ESTE módulo dispara sobre
 * arrendadores (ver `ACCIONES_PROVEEDORES`) en vez de un filtro server-side por entidad.
 */
function TabHistorial() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);

  const cargarPagina = useCallback(async (pagina: number) => {
    const data = await auditLogService.buscar({ page: pagina, size: 50 });
    setHayMas(pagina < data.totalPages - 1);
    return data.content.filter(e => ACCIONES_PROVEEDORES.includes(e.accion));
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(false);
    cargarPagina(0)
      .then(filtradas => {
        if (cancelado) return;
        setEntries(filtradas);
        setPage(0);
      })
      .catch(() => { if (!cancelado) setError(true); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [cargarPagina]);

  const cargarMas = async () => {
    setCargandoMas(true);
    try {
      const siguiente = page + 1;
      const filtradas = await cargarPagina(siguiente);
      setEntries(prev => [...prev, ...filtradas]);
      setPage(siguiente);
    } catch {
      // Silencioso: el botón sigue disponible para reintentar.
    } finally {
      setCargandoMas(false);
    }
  };

  if (cargando) return (
    <div className="py-20 text-center">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 animate-pulse">Cargando historial...</span>
    </div>
  );

  if (error) return (
    <div className="py-24 text-center bg-white border border-dashed border-red-200 rounded-[2rem]">
      <AlertTriangle size={32} className="mx-auto text-red-300 mb-4" />
      <p className="text-slate-500 font-bold text-sm">No se pudo cargar el historial. Intenta recargar la página.</p>
    </div>
  );

  if (entries.length === 0) return (
    <div className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-[2rem]">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-5 mx-auto">
        <Clock size={28} className="text-slate-300" />
      </div>
      <h2 className="text-xl font-black text-slate-700 tracking-tighter mb-2">Sin actividad aún</h2>
      <p className="text-slate-400 font-medium max-w-sm mx-auto text-sm">
        Las acciones sobre arrendadores (baneos, altas, bajas, aprobación/rechazo de
        documentos) quedan registradas aquí de forma permanente.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {entries.length} acción{entries.length !== 1 ? 'es' : ''} registrada{entries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {entries.map(entry => (
            <div key={entry.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50/60 transition-colors">
              <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <ChevronRight size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 leading-snug">
                  {ACCION_LABEL[entry.accion] ?? entry.accion}
                </p>
                {entry.detalle && (
                  <p className="text-xs text-slate-500 mt-0.5 break-words">{entry.detalle}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {entry.actorCorreo && (
                    <span className="text-[10px] text-slate-400 font-medium">{entry.actorCorreo}</span>
                  )}
                  <span className="text-[10px] text-slate-300">·</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(entry.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                    {new Date(entry.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {hayMas && (
        <div className="text-center">
          <button
            onClick={cargarMas}
            disabled={cargandoMas}
            className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50 transition-all disabled:opacity-40"
          >
            {cargandoMas ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
function AdminProveedoresContent() {
  const [tab, setTab] = useTabParam({ values: TAB_VALUES, defaultValue: 'gestion' });

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'directorio', label: 'Directorio', icon: 'badge' },
    { id: 'gestion', label: 'Gestión', icon: 'manage_accounts' },
    { id: 'documentos', label: 'Documentos', icon: 'pending_actions' },
    { id: 'historial', label: 'Historial', icon: 'history' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Header */}
      <div>
        <span className="text-primary font-black tracking-[0.3em] uppercase text-[9px] mb-2 block">Validaciones</span>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Proveedores</h1>
        <p className="text-slate-400 font-medium text-sm mt-2">Gestión y verificación de arrendadores de la plataforma</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-200',
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <span className="material-symbols-outlined text-[17px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'directorio' && (
        <UserDirectoryTable
          rol="ARRENDADOR"
          title="Arrendadores — Directorio"
          description="Consulta rápida de perfiles de arrendadores registrados en la plataforma."
        />
      )}
      {tab === 'gestion' && <TabGestion />}
      {tab === 'documentos' && <TabDocumentos />}
      {tab === 'historial' && <TabHistorial />}
    </div>
  );
}

export default function AdminProveedoresPage() {
  return (
    <Suspense fallback={null}>
      <AdminProveedoresContent />
    </Suspense>
  );
}
