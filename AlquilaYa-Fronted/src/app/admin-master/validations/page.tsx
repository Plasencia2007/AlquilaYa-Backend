'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, XCircle, ExternalLink, MessageSquare, Search } from 'lucide-react';
import { Card } from '@/components/ui/legacy-card';
import { Button } from '@/components/ui/legacy-button';
import { parseFetchError } from '@/lib/api-errors';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
const UPLOADS_BASE = process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:8080/uploads';

interface Documento {
  id: number;
  tipoDocumento: string;
  archivoUrl: string;
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    correo: string;
    telefono: string;
    rol: string;
  };
  fechaCreacion: string;
}

export default function AdminValidationsPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verificandoId, setVerificandoId] = useState<number | null>(null);

  useEffect(() => {
    cargarPendientes();
  }, []);

  const cargarPendientes = async () => {
    try {
      const response = await fetch(`${API_BASE}/usuarios/documentos/admin/pending`);
      if (response.ok) {
        const data = await response.json();
        setDocumentos(data);
      }
    } catch (error) {
      console.error("Error cargando pendientes:", error);
    } finally {
      setCargando(false);
    }
  };

  const handleVerify = async (id: number, estado: 'APROBADO' | 'RECHAZADO', comentario?: string) => {
    setVerificandoId(id);
    try {
      const response = await fetch(`${API_BASE}/usuarios/documentos/admin/verify/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, comentario })
      });

      if (response.ok) {
        setDocumentos(docList => docList.filter(d => d.id !== id));
      } else {
        alert(await parseFetchError(response, 'Error al procesar la verificación'));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setVerificandoId(null);
    }
  };

  const openRejectDialog = (id: number) => {
    const comentario = prompt("Indique el motivo del rechazo:");
    if (comentario) {
      handleVerify(id, 'RECHAZADO', comentario);
    }
  };

  if (cargando) return <div className="p-10 flex justify-center text-[#8f0304] animate-pulse font-bold tracking-widest">CARGANDO VALIDACIONES...</div>;

  return (
    <div className="space-y-8 animate-fade-in p-6 max-w-7xl mx-auto">
      <header>
        <h1 className="text-4xl font-black text-[#281721] tracking-tighter uppercase mb-2">Validación de Identidad</h1>
        <p className="text-[#bda5a8] text-sm font-medium">Revisa y confirma la legitimidad de los usuarios de AlquilaYa.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documentos.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white/40 rounded-3xl border border-dashed border-[#bda5a8]/50">
            <ShieldAlert size={48} className="mx-auto text-[#bda5a8] mb-4 opacity-30" />
            <p className="text-[#bda5a8] font-black uppercase tracking-widest">No hay documentos pendientes de revisión</p>
          </div>
        ) : documentos.map((doc) => (
          <Card key={doc.id} className="overflow-hidden border border-white/50 bg-white/60 hover:shadow-2xl hover:shadow-[#8f0304]/5 transition-all duration-500 group">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-[#8f0304]/10 rounded-2xl flex items-center justify-center text-[#8f0304]">
                  <ShieldAlert size={24} />
                </div>
                <span className="text-[10px] font-black bg-[#8f0304]/5 text-[#8f0304] px-3 py-1 rounded-full uppercase tracking-widest">
                  {doc.usuario.rol}
                </span>
              </div>

              <h3 className="text-lg font-black text-[#281721] truncate">{doc.usuario.nombre} {doc.usuario.apellido}</h3>
              <p className="text-xs text-[#bda5a8] mb-4 flex items-center gap-1">
                <Search size={12} /> {doc.tipoDocumento}
              </p>

              <div className="space-y-3 pt-4 border-t border-[#f2ede9]">
                 <div className="flex items-center justify-between text-[11px] font-medium text-[#474c64]">
                    <span>Correo:</span>
                    <span className="font-bold">{doc.usuario.correo}</span>
                 </div>
                 <div className="flex items-center justify-between text-[11px] font-medium text-[#474c64]">
                    <span>WhatsApp:</span>
                    <span className="font-bold">{doc.usuario.telefono}</span>
                 </div>
                 <div className="flex items-center justify-between text-[11px] font-medium text-[#474c64]">
                    <span>Fecha:</span>
                    <span>{new Date(doc.fechaCreacion).toLocaleDateString()}</span>
                 </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <a 
                  href={`${UPLOADS_BASE}/documents/${doc.archivoUrl}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#281721] text-white text-[11px] font-bold rounded-xl hover:bg-black transition-all mb-2 shadow-lg shadow-black/10"
                >
                  <ExternalLink size={14} /> Ver Documento Original
                </a>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleVerify(doc.id, 'APROBADO')}
                    disabled={verificandoId === doc.id}
                    className="flex-1 flex items-center justify-center gap-1 py-3 bg-green-500 text-white text-[11px] font-black rounded-xl hover:bg-green-600 transition-all disabled:opacity-50"
                  >
                    <CheckCircle size={14} /> APROBAR
                  </button>
                  <button 
                    onClick={() => openRejectDialog(doc.id)}
                    disabled={verificandoId === doc.id}
                    className="flex-1 flex items-center justify-center gap-1 py-3 bg-white border border-red-500 text-red-500 text-[11px] font-black rounded-xl hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    <XCircle size={14} /> RECHAZAR
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
