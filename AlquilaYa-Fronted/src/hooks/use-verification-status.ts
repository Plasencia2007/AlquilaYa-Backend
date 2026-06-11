'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { documentsService } from '@/services/documents-service';
import type { TipoDocConfig } from '@/types/profile';

const TIPOS_FALLBACK: TipoDocConfig[] = [
  { tipo: 'DNI_FRONTAL', titulo: 'DNI Parte Frontal', descripcion: 'Foto del frente de tu DNI' },
  { tipo: 'DNI_REVERSO', titulo: 'DNI Parte Posterior', descripcion: 'Foto del reverso de tu DNI' },
];

export interface VerificationStatus {
  /** true si cada tipo de documento requerido tiene al menos uno APROBADO. */
  verificado: boolean;
  cargando: boolean;
  /** false si no hay sesión o el rol no es ESTUDIANTE (no aplica verificación). */
  aplicable: boolean;
  recargar: () => void;
}

/**
 * Estado de verificación de identidad del estudiante, derivado de sus
 * documentos (misma regla que el backend: todos los requeridos APROBADOS).
 */
export function useVerificationStatus(): VerificationStatus {
  const { estaAutenticado, usuario, cargando: cargandoAuth } = useAuth();
  const [verificado, setVerificado] = useState(false);
  const [cargando, setCargando] = useState(true);

  const aplicable = estaAutenticado && usuario?.rol === 'ESTUDIANTE';

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [tiposData, docsData] = await Promise.allSettled([
        documentsService.obtenerTiposRequeridos(),
        documentsService.listarMisDocumentos(),
      ]);

      const tipos =
        tiposData.status === 'fulfilled' && tiposData.value.length > 0
          ? tiposData.value
          : TIPOS_FALLBACK;
      const docs = docsData.status === 'fulfilled' ? docsData.value : [];

      setVerificado(
        tipos.every((t) =>
          docs.some((d) => d.tipoDocumento === t.tipo && d.estadoVerificacion === 'APROBADO'),
        ),
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (cargandoAuth) return;
    if (!aplicable) {
      setVerificado(false);
      setCargando(false);
      return;
    }
    void cargar();
  }, [cargandoAuth, aplicable, cargar]);

  return { verificado, cargando, aplicable, recargar: cargar };
}
