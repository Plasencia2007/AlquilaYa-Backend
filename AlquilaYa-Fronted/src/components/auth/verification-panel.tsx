'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Clock, FileText, Info, ShieldCheck, Upload, X, XCircle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { documentUploadSchema } from '@/schemas/document-schema';
import { documentsService } from '@/services/documents-service';
import { useAuth } from '@/hooks/use-auth';
import type { Documento, EstadoDocumento, TipoDocConfig } from '@/types/profile';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const TIPOS_FALLBACK: TipoDocConfig[] = [
  { tipo: 'DNI_FRONTAL',  titulo: 'DNI Parte Frontal',   descripcion: 'Foto del frente de tu DNI' },
  { tipo: 'DNI_REVERSO',  titulo: 'DNI Parte Posterior', descripcion: 'Foto del reverso de tu DNI' },
];

function resolverUrlArchivo(archivoUrl: string): string {
  if (archivoUrl.startsWith('http')) return archivoUrl;
  return `${API_BASE}/storage/${archivoUrl}`;
}

function esPdf(url: string): boolean {
  return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/');
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white/40 rounded-2xl border border-white/20 p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/50 shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 bg-white/50 rounded w-2/5" />
        <div className="h-2 bg-white/30 rounded w-3/5" />
      </div>
      <div className="w-24 h-8 bg-white/50 rounded-full shrink-0" />
    </div>
  );
}

interface StatusBadgeProps { estado: EstadoDocumento | null }
function StatusBadge({ estado }: StatusBadgeProps) {
  if (!estado) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#bda5a8]/40 bg-white/30 text-[10px] font-black uppercase tracking-widest text-[#bda5a8]">
        Sin subir
      </span>
    );
  }
  const variants: Record<EstadoDocumento, string> = {
    PENDIENTE: 'bg-amber-100 text-amber-700 border-amber-200',
    APROBADO:  'bg-green-100 text-green-700 border-green-200',
    RECHAZADO: 'bg-red-100 text-red-700 border-red-200',
  };
  const icons: Record<EstadoDocumento, React.ReactNode> = {
    PENDIENTE: <Clock size={12} />,
    APROBADO:  <CheckCircle size={12} />,
    RECHAZADO: <XCircle size={12} />,
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest', variants[estado])}>
      {icons[estado]}
      {estado}
    </span>
  );
}

interface PreviewModalProps { url: string; onClose: () => void }
function PreviewModal({ url, onClose }: PreviewModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
      >
        <X size={18} />
      </button>
      <img
        src={url}
        alt="Documento de verificación"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

interface DocumentCardProps {
  config: TipoDocConfig;
  doc: Documento | undefined;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onPreview: (url: string) => void;
}
function DocumentCard({ config, doc, isUploading, onUpload, onPreview }: DocumentCardProps) {
  const estado = doc?.estadoVerificacion ?? null;
  const puedeSubir = !doc || estado === 'RECHAZADO';
  const tieneArchivo = !!doc?.archivoUrl;

  return (
    <div className="bg-white/60 rounded-2xl border border-white/30 p-5 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#8f0304]/10 rounded-xl flex items-center justify-center text-[#8f0304] shrink-0 mt-0.5">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#281721] leading-tight">{config.titulo}</p>
            <p className="text-[11px] text-[#bda5a8] mt-0.5">{config.descripcion}</p>
          </div>
        </div>
        <StatusBadge estado={estado} />
      </div>

      {estado === 'RECHAZADO' && doc?.comentarioRechazo && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
          <XCircle className="text-red-500 shrink-0 mt-0.5" size={14} />
          <p className="text-[11px] text-red-700 leading-relaxed">
            <span className="font-bold">Motivo de rechazo: </span>
            {doc.comentarioRechazo}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {tieneArchivo && (
          <button
            type="button"
            onClick={() => {
              const url = resolverUrlArchivo(doc!.archivoUrl);
              if (esPdf(url)) { window.open(url, '_blank'); }
              else { onPreview(url); }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#8f0304]/30 text-[#8f0304] text-xs font-bold hover:bg-[#8f0304]/5 transition-colors"
          >
            Ver documento
          </button>
        )}

        {puedeSubir && (
          <label className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer',
            isUploading
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-[#8f0304] text-white hover:bg-[#7a0203] shadow-sm shadow-[#8f0304]/20'
          )}>
            <Upload size={13} />
            <span>{isUploading ? 'Subiendo…' : estado === 'RECHAZADO' ? 'Re-subir' : 'Subir documento'}</span>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barra de progreso
// ---------------------------------------------------------------------------

interface ProgressBarProps { aprobados: number; total: number }
function ProgressBar({ aprobados, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((aprobados / total) * 100);
  const allDone = aprobados === total && total > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#281721]/70">
          {allDone ? '¡Todo verificado!' : `${aprobados} de ${total} documentos aprobados`}
        </p>
        <span className={cn(
          'text-[10px] font-black uppercase tracking-wider',
          allDone ? 'text-green-600' : 'text-[#8f0304]'
        )}>
          {pct}%
        </span>
      </div>
      <div className="h-2 bg-white/40 rounded-full overflow-hidden border border-white/20">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            allDone ? 'bg-green-500' : 'bg-[#8f0304]'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'verification_panel_collapsed';

export default function VerificationPanel() {
  const { usuario, inicializar } = useAuth();
  const [tipos, setTipos] = useState<TipoDocConfig[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [dniInput, setDniInput] = useState('');
  const [dniVerificando, setDniVerificando] = useState(false);
  const [colapsado, setColapsado] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    cargar();
  }, []);

  const toggleColapsar = () => {
    setColapsado((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const [tiposData, docsData] = await Promise.allSettled([
        documentsService.obtenerTiposRequeridos(),
        documentsService.listarMisDocumentos(),
      ]);

      setTipos(tiposData.status === 'fulfilled' && tiposData.value.length > 0
        ? tiposData.value
        : TIPOS_FALLBACK);

      if (docsData.status === 'fulfilled') {
        setDocumentos(docsData.value);
      } else {
        notify.error(null, 'No se pudieron cargar tus documentos');
      }
    } finally {
      setCargando(false);
    }
  };

  const handleUpload = async (tipo: string, file: File) => {
    const validation = documentUploadSchema.safeParse({ archivo: file, tipo });
    if (!validation.success) {
      notify.error(null, validation.error.issues[0]?.message || 'Archivo inválido');
      return;
    }
    setSubiendo(tipo);
    try {
      await documentsService.subirDocumento(tipo as any, file);
      notify.success('Documento subido', 'Lo revisaremos en menos de 24h.');
      await cargar();
    } catch (err) {
      notify.error(err, 'Error al subir el documento');
    } finally {
      setSubiendo(null);
    }
  };

  const handleVerificarDniInstantaneo = async () => {
    if (dniInput.length !== 8) {
      notify.error(null, 'El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    setDniVerificando(true);
    try {
      await documentsService.verificarDniInstantaneo(dniInput);
      notify.success('¡Identidad verificada!', 'Tus datos coinciden con RENIEC.');
      setDniInput('');
      await cargar();
      inicializar();
    } catch (err) {
      notify.error(err, 'Error de verificación');
    } finally {
      setDniVerificando(false);
    }
  };

  const aprobados = documentos.filter(d => d.estadoVerificacion === 'APROBADO').length;
  const total = tipos.length;
  const pct = total === 0 ? 0 : Math.round((aprobados / total) * 100);
  const todosAprobados = aprobados === total && total > 0;

  return (
    <>
      {previewUrl && (
        <PreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      <div className="bg-[#e8e3df] rounded-[2rem] border border-white/30 shadow-sm overflow-hidden relative">
        {/* Marca de agua */}
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          <ShieldCheck size={180} className="text-[#8f0304]" />
        </div>

        {/* ── Header siempre visible ── */}
        <button
          type="button"
          onClick={toggleColapsar}
          className="relative z-10 w-full flex items-center gap-4 p-6 text-left hover:bg-black/[0.02] transition-colors"
        >
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 transition-colors',
            todosAprobados ? 'bg-green-500 shadow-green-200' : 'bg-[#8f0304] shadow-[#8f0304]/20'
          )}>
            <ShieldCheck size={22} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-[#281721] tracking-tight">
              Verifica tu Identidad
            </p>
            <p className="text-[11px] text-[#bda5a8] mt-0.5 truncate">
              {cargando
                ? 'Cargando documentos…'
                : todosAprobados
                  ? '¡Identidad verificada! Todos los documentos aprobados.'
                  : `${aprobados} de ${total} documentos aprobados · ${pct}%`}
            </p>
          </div>

          {/* Barra de progreso compacta */}
          {!cargando && total > 0 && (
            <div className="hidden sm:block w-28 shrink-0">
              <div className="h-1.5 bg-white/40 rounded-full overflow-hidden border border-white/20">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    todosAprobados ? 'bg-green-500' : 'bg-[#8f0304]'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Chevron */}
          <div className={cn(
            'w-7 h-7 rounded-full bg-white/50 flex items-center justify-center shrink-0 transition-transform duration-300',
            colapsado ? 'rotate-0' : 'rotate-180'
          )}>
            <span className="material-symbols-outlined text-[16px] text-[#8f0304]">
              expand_more
            </span>
          </div>
        </button>

        {/* ── Contenido colapsable ── */}
        <div className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          colapsado ? 'max-h-0' : 'max-h-[1000px]'
        )}>
          <div className="relative z-10 space-y-5 px-6 pb-6">
            {/* Barra de progreso completa */}
            {!cargando && total > 0 && (
              <ProgressBar aprobados={aprobados} total={total} />
            )}

            {/* Tarjeta de verificación instantánea */}
            {!cargando && !todosAprobados && (
              <div className="bg-gradient-to-r from-primary/10 via-violet-500/5 to-pink-500/5 border border-primary/25 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-primary to-violet-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-primary/25">
                    <span className="material-symbols-outlined text-[20px]">bolt</span>
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-black text-foreground leading-tight">Verificación Digital por RENIEC</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Verifica tu identidad al instante. Ingresa tu número de DNI y el sistema validará tu nombre con la base de datos oficial.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">
                      badge
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      placeholder="Ingresa tu DNI (8 dígitos)"
                      value={dniInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setDniInput(val);
                      }}
                      disabled={dniVerificando}
                      className="w-full h-11 bg-white/60 border border-input rounded-xl pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-semibold placeholder:text-muted-foreground/45"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleVerificarDniInstantaneo}
                    disabled={dniVerificando || dniInput.length !== 8}
                    className="h-11 px-5 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 disabled:from-muted disabled:to-muted text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {dniVerificando ? (
                      <>
                        <span className="animate-spin mr-1">⏳</span>
                        Verificando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        Validar Identidad
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Document cards */}
            <div className="space-y-3">
              {cargando ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                tipos.map((cfg) => (
                  <DocumentCard
                    key={cfg.tipo}
                    config={cfg}
                    doc={documentos.find(d => d.tipoDocumento === cfg.tipo)}
                    isUploading={subiendo === cfg.tipo}
                    onUpload={(file) => handleUpload(cfg.tipo, file)}
                    onPreview={setPreviewUrl}
                  />
                ))
              )}
            </div>

            {/* Disclaimer */}
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/50 flex gap-3">
              <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Tus documentos son procesados de forma segura y solo se utilizan para verificar tu identidad en la plataforma.
                El proceso de revisión puede tardar hasta <strong>24 horas hábiles</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
