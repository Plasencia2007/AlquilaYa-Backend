'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, FileText, Upload, Clock, XCircle, CheckCircle, Info } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { documentUploadSchema } from '@/schemas/document-schema';
import { parseFetchError } from '@/lib/api-errors';

type TipoDoc = 'DNI_FRONTAL' | 'DNI_REVERSO' | 'CARNE_ESTUDIANTE' | 'RECIBO_LUZ';
type EstadoVerif = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

interface Documento {
  id: number;
  tipoDocumento: TipoDoc;
  estadoVerificacion: EstadoVerif;
  comentarioRechazo?: string;
  fechaCreacion: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export default function VerificationPanel() {
  const { usuario } = useAuthStore();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState<TipoDoc | null>(null);

  useEffect(() => {
    if (usuario?.id) {
      cargarDocumentos();
    }
  }, [usuario?.id]);

  const cargarDocumentos = async () => {
    try {
      const response = await fetch(`${API_BASE}/usuarios/documentos/usuario/${usuario?.id}`);
      if (response.ok) {
        const data = await response.json();
        setDocumentos(data);
      } else {
        notify.error(null, await parseFetchError(response, 'No se pudieron cargar tus documentos'));
      }
    } catch (err) {
      notify.error(err, 'No se pudieron cargar tus documentos');
    } finally {
      setCargando(false);
    }
  };

  const handleFileUpload = async (tipo: TipoDoc, file: File) => {
    if (!usuario?.id) return;

    const validation = documentUploadSchema.safeParse({ archivo: file, tipo });
    if (!validation.success) {
      notify.error(null, validation.error.issues[0]?.message || 'Archivo inválido');
      return;
    }

    setSubiendo(tipo);
    const formData = new FormData();
    formData.append('usuarioId', usuario.id.toString());
    formData.append('tipo', tipo);
    formData.append('archivo', file);

    try {
      const response = await fetch(`${API_BASE}/usuarios/documentos/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        notify.success('Documento subido', 'Lo revisaremos en menos de 24h.');
        await cargarDocumentos();
      } else {
        notify.error(null, await parseFetchError(response, 'Error al subir el documento'));
      }
    } catch (err) {
      notify.error(err, 'Error de conexión');
    } finally {
      setSubiendo(null);
    }
  };

  const getStatusIcon = (estado: EstadoVerif) => {
    switch (estado) {
      case 'APROBADO': return <CheckCircle className="text-green-500 w-5 h-5" />;
      case 'RECHAZADO': return <XCircle className="text-red-500 w-5 h-5" />;
      default: return <Clock className="text-amber-500 w-5 h-5" />;
    }
  };

  const renderDocRow = (titulo: string, tipo: TipoDoc) => {
    const doc = documentos.find(d => d.tipoDocumento === tipo);
    const isUploading = subiendo === tipo;

    return (
      <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/20 group hover:bg-white/60 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#8f0304]/10 rounded-xl flex items-center justify-center text-[#8f0304]">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#281721]">{titulo}</p>
            {doc ? (
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                doc.estadoVerificacion === 'APROBADO' ? "text-green-600" :
                doc.estadoVerificacion === 'RECHAZADO' ? "text-red-600" : "text-amber-600"
              )}>
                {doc.estadoVerificacion}
              </p>
            ) : (
              <p className="text-[10px] text-[#bda5a8] font-medium italic">Sin subir</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {doc && (
            <div className="flex items-center gap-2">
              {doc.estadoVerificacion === 'RECHAZADO' && doc.comentarioRechazo && (
                <div className="group/info relative">
                  <Info className="text-red-400 w-4 h-4 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-red-50 text-red-700 text-[10px] rounded-lg shadow-xl opacity-0 scale-95 group-hover/info:opacity-100 group-hover/info:scale-100 transition-all z-10">
                    {doc.comentarioRechazo}
                  </div>
                </div>
              )}
              {getStatusIcon(doc.estadoVerificacion)}
            </div>
          )}

          {(!doc || doc.estadoVerificacion === 'RECHAZADO') && (
            <label className={cn(
              "cursor-pointer flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
              isUploading ? "bg-gray-200 animate-pulse" : "bg-white hover:bg-[#8f0304] hover:text-white shadow-sm"
            )}>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*,.pdf" 
                disabled={!!isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(tipo, file);
                }}
              />
              <Upload size={18} />
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#e8e3df] rounded-[2rem] p-8 border border-white/30 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
        <ShieldCheck size={180} className="text-[#8f0304]" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#8f0304] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#8f0304]/20">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-[#281721] tracking-tight">Verifica tu Identidad</h3>
            <p className="text-[#bda5a8] text-sm font-medium">Sube tus documentos para desbloquear beneficios premium.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#8f0304] uppercase tracking-[0.2em] px-1">Identidad (DNI)</h4>
            {renderDocRow('DNI Parte Frontal', 'DNI_FRONTAL')}
            {renderDocRow('DNI Parte Posterior', 'DNI_REVERSO')}
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#8f0304] uppercase tracking-[0.2em] px-1">
              {usuario?.rol === 'ESTUDIANTE' ? 'Estudios' : 'Vivienda'}
            </h4>
            {usuario?.rol === 'ESTUDIANTE' 
              ? renderDocRow('Carné Universitario', 'CARNE_ESTUDIANTE')
              : renderDocRow('Recibo de Luz/Agua', 'RECIBO_LUZ')
            }
          </div>
        </div>

        <div className="mt-8 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/50 flex gap-4">
          <Info className="text-amber-600 shrink-0" size={20} />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Tus documentos son procesados de forma segura y solo se utilizan para verificar tu identidad en la plataforma. 
            El proceso de revisión puede tardar hasta <strong>24 horas hábiles</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
