'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, CheckCircle2, Clock, FileText, Loader2, PenLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { formatearFecha } from '@/lib/relative-time';
import { reservationService } from '@/services/reservation-service';
import type { Reserva } from '@/types/reserva';

interface Props {
  reserva: Reserva;
  /** Se llama tras firmar con éxito, para que el padre refresque la reserva. */
  onFirmado?: (reserva: Reserva) => void;
}

/** Solo tiene sentido ver/firmar el contrato una vez que la reserva se pagó (G4). */
const ESTADOS_CON_CONTRATO: Reserva['estado'][] = ['PAGADA', 'FINALIZADA'];

/** Umbral (px) para considerar "llegó al final" y tolerar redondeos de scroll. */
const UMBRAL_SCROLL_PX = 24;

/**
 * `react-pdf`/`pdfjs-dist` usan `canvas`, que no existe en Node — se cargan solo en cliente
 * (`ssr: false`) para no romper el render en el servidor. El worker de PDF.js se resuelve por
 * CDN pineado a la versión exacta que trae `pdfjs-dist` (recomendado por el propio `react-pdf`
 * para evitar depender de cómo cada bundler resuelve assets binarios de `node_modules`; ver
 * https://github.com/wojtekmaj/react-pdf#configure-pdfjs-worker).
 */
const PdfDocument = dynamic(
  () =>
    import('react-pdf').then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
      return mod.Document;
    }),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);
const PdfPage = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

/**
 * Ver y firmar el contrato de una reserva (G4, ítems 236-237). El backend genera el PDF
 * on-demand (`GET /reservas/{id}/contrato`) y registra la firma como un simple timestamp por
 * parte (`POST /reservas/{id}/contrato/firmar`) — un placeholder honesto, no una firma
 * criptográfica (así está documentado en `ContratoService`/`ReservaController`).
 */
export function ContractActions({ reserva, onFirmado }: Props) {
  const [abriendo, setAbriendo] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [leyoHastaElFinal, setLeyoHastaElFinal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cargandoPreview = dialogoAbierto && !previewUrl && !previewError;

  useEffect(() => {
    if (!dialogoAbierto || previewUrl || previewError) return;
    reservationService
      .descargarContrato(reserva.id)
      .then((blob) => setPreviewUrl(URL.createObjectURL(blob)))
      .catch((err) => {
        notify.error(err, 'No se pudo cargar el contrato.');
        setPreviewError('No se pudo cargar el contrato. Es posible que aún no esté generado.');
      });
  }, [dialogoAbierto, previewUrl, previewError, reserva.id]);

  if (!ESTADOS_CON_CONTRATO.includes(reserva.estado)) return null;

  const verificarScrollCompleto = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= UMBRAL_SCROLL_PX) {
      setLeyoHastaElFinal(true);
    }
  };

  const verContrato = async () => {
    setAbriendo(true);
    try {
      const blob = await reservationService.descargarContrato(reserva.id);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) notify.warning('Habilita las ventanas emergentes para ver el contrato.');
      // Revocamos con margen: la pestaña nueva necesita tiempo para terminar de cargar el blob.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      notify.error(err, 'No se pudo abrir el contrato.');
    } finally {
      setAbriendo(false);
    }
  };

  const firmar = async () => {
    if (!aceptaTerminos) return;
    setFirmando(true);
    try {
      const actualizada = await reservationService.firmarContrato(reserva.id);
      notify.success('Firmaste el contrato');
      setDialogoAbierto(false);
      setAceptaTerminos(false);
      onFirmado?.(actualizada);
    } catch (err) {
      notify.error(err, 'No se pudo registrar tu firma.');
    } finally {
      setFirmando(false);
    }
  };

  const yoFirme = Boolean(reserva.firmaEstudianteAt);
  const arrendadorFirmo = Boolean(reserva.firmaArrendadorAt);
  const ambasFirmas = yoFirme && arrendadorFirmo;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-bold text-foreground">
          <FileText className="size-4 text-primary" aria-hidden />
          Contrato
        </h3>

        {ambasFirmas ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-light px-3 py-1 text-[11px] font-bold text-success">
            <CheckCircle2 className="size-3.5" aria-hidden /> Firmado por ambas partes
          </span>
        ) : yoFirme ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-light px-3 py-1 text-[11px] font-bold text-warning">
            <Clock className="size-3.5" aria-hidden /> Esperando firma del arrendador
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
            <Clock className="size-3.5" aria-hidden /> Pendiente de tu firma
          </span>
        )}
      </div>

      {yoFirme && (
        <p className="text-xs text-muted-foreground">
          Firmaste el {formatearFecha(reserva.firmaEstudianteAt, true)}
          {arrendadorFirmo && <> · el arrendador firmó el {formatearFecha(reserva.firmaArrendadorAt, true)}</>}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={verContrato} disabled={abriendo} className="gap-1.5 font-bold">
          {abriendo ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          Ver contrato
        </Button>

        {!yoFirme && (
          <Dialog
            open={dialogoAbierto}
            onOpenChange={(open) => {
              setDialogoAbierto(open);
              if (!open) {
                setAceptaTerminos(false);
                setNumPages(null);
                setLeyoHastaElFinal(false);
                setPreviewError(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }
            }}
          >
            <Button size="sm" className="gap-1.5 font-bold" onClick={() => setDialogoAbierto(true)}>
              <PenLine className="size-4" /> Revisar y firmar
            </Button>
            <DialogContent className="max-w-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle>Firmar contrato</DialogTitle>
                <DialogDescription>
                  Revisa el contrato antes de firmar. Esta firma registra tu aceptación con fecha
                  y hora — es un acuerdo electrónico, no una firma digital certificada.
                </DialogDescription>
              </DialogHeader>

              <div
                ref={scrollRef}
                onScroll={verificarScrollCompleto}
                className="max-h-96 overflow-auto rounded-xl border border-border bg-muted/40 p-2"
              >
                {previewError ? (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <AlertTriangle className="size-6 text-destructive" aria-hidden />
                    <p className="text-sm text-destructive">{previewError}</p>
                    <DialogClose asChild>
                      <Button variant="outline" size="sm">
                        Cerrar
                      </Button>
                    </DialogClose>
                  </div>
                ) : cargandoPreview ? (
                  <Skeleton className="h-72 w-full rounded-lg" />
                ) : (
                  <PdfDocument
                    file={previewUrl}
                    loading={<Skeleton className="h-72 w-full rounded-lg" />}
                    error={<p className="p-6 text-center text-sm text-destructive">No se pudo mostrar el contrato.</p>}
                    onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
                    onLoadError={(err) => {
                      notify.error(err, 'No se pudo mostrar el contrato.');
                      setPreviewError('No se pudo mostrar el contrato.');
                    }}
                  >
                    {Array.from({ length: numPages ?? 0 }, (_, i) => (
                      <PdfPage
                        key={i + 1}
                        pageNumber={i + 1}
                        width={340}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        onRenderSuccess={i + 1 === numPages ? verificarScrollCompleto : undefined}
                        className="mb-2 last:mb-0"
                      />
                    ))}
                  </PdfDocument>
                )}
              </div>

              {!leyoHastaElFinal && !previewError && (
                <p className="text-xs text-muted-foreground">
                  Desplázate hasta el final del contrato para habilitar la firma.
                </p>
              )}

              <label className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-3 text-sm">
                <Checkbox
                  checked={aceptaTerminos}
                  onCheckedChange={(v) => setAceptaTerminos(v === true)}
                  className="mt-0.5"
                />
                <span className="text-foreground">
                  Leí el contrato y acepto sus términos y condiciones.
                </span>
              </label>

              <DialogFooter>
                <Button
                  onClick={firmar}
                  disabled={!aceptaTerminos || !leyoHastaElFinal || firmando}
                  loading={firmando}
                  className={cn('font-bold', (!aceptaTerminos || !leyoHastaElFinal) && 'opacity-60')}
                >
                  Firmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
