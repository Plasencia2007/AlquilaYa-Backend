'use client';

import { useEffect, useState } from 'react';

import { Card } from '@/components/ui/legacy-card';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { documentsService } from '@/services/documents-service';
import type { Documento, EstadoDocumento, TipoDocumento } from '@/types/profile';

interface TipoDocConfig {
  tipo: TipoDocumento;
  titulo: string;
  descripcion: string;
}

// Para arrendadores: DNI + comprobante de propiedad (recibo de luz como prueba).
const TIPOS_REQUERIDOS: TipoDocConfig[] = [
  { tipo: 'DNI_FRONTAL', titulo: 'DNI (frontal)', descripcion: 'Foto del frente de tu DNI.' },
  { tipo: 'DNI_REVERSO', titulo: 'DNI (reverso)', descripcion: 'Foto del reverso de tu DNI.' },
  {
    tipo: 'RECIBO_LUZ',
    titulo: 'Comprobante de propiedad',
    descripcion: 'Recibo de luz reciente o título de propiedad.',
  },
];

const ESTADO_STYLES: Record<EstadoDocumento, string> = {
  PENDIENTE: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  APROBADO: 'bg-green-500/10 text-green-600 border-green-500/20',
  RECHAZADO: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function LandlordProfileDocsPage() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState<TipoDocumento | null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const lista = await documentsService.listarMisDocumentos();
      setDocs(lista);
    } catch (err) {
      notify.error(err, 'No se pudieron cargar tus documentos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const onUpload = async (tipo: TipoDocumento, file: File) => {
    setSubiendo(tipo);
    try {
      await documentsService.subirDocumento(tipo, file);
      notify.success('Documento subido. Quedará pendiente de revisión.');
      await cargar();
    } catch (err) {
      notify.error(err, 'No se pudo subir el documento');
    } finally {
      setSubiendo(null);
    }
  };

  const docPorTipo = (tipo: TipoDocumento): Documento | undefined =>
    docs.find((d) => d.tipoDocumento === tipo);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
          Documentos de verificación
        </h1>
        <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
          Verifica tu identidad y la propiedad para que los estudiantes confíen en ti.
        </p>
      </header>

      {cargando && (
        <Card className="bg-white/40 border border-on-surface/5 p-6 text-sm text-on-surface-variant">
          Cargando documentos…
        </Card>
      )}

      <div className="space-y-3">
        {TIPOS_REQUERIDOS.map((cfg) => {
          const doc = docPorTipo(cfg.tipo);
          const estado = doc?.estadoVerificacion;
          return (
            <Card
              key={cfg.tipo}
              className="bg-white/40 border border-on-surface/5 p-5 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="flex-1">
                <h3 className="text-sm font-black text-on-surface/90">{cfg.titulo}</h3>
                <p className="text-[11px] text-on-surface-variant mt-1">{cfg.descripcion}</p>
                {doc?.comentarioRechazo && (
                  <p className="text-[11px] text-red-500 mt-2 italic">
                    Motivo: {doc.comentarioRechazo}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {estado ? (
                  <span
                    className={cn(
                      'inline-flex items-center px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest',
                      ESTADO_STYLES[estado],
                    )}
                  >
                    {estado}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full border border-on-surface/10 text-[10px] font-black uppercase tracking-widest text-on-surface/50">
                    Sin subir
                  </span>
                )}

                <label
                  className={cn(
                    'cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-colors',
                    subiendo === cfg.tipo
                      ? 'bg-on-surface/20 text-on-surface/40 cursor-wait'
                      : 'bg-blue-500 text-white hover:bg-blue-600',
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {doc ? 'cached' : 'upload'}
                  </span>
                  {subiendo === cfg.tipo
                    ? 'Subiendo…'
                    : doc
                      ? 'Reemplazar'
                      : 'Subir'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={subiendo === cfg.tipo}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(cfg.tipo, f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
