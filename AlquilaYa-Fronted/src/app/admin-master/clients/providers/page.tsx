'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Ítem 363: esta pantalla (directorio de arrendadores, solo lectura) se fusionó dentro del
 * tab "Directorio" de `/admin-master/validations/providers` (gestión completa: directorio +
 * documentos + historial) para no duplicar la misma UI en dos rutas del panel admin.
 *
 * Se conserva el archivo como redirect (en vez de borrarlo) por si algún link externo o
 * favorito histórico sigue apuntando aquí.
 */
export default function AdminProvidersDirectoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin-master/validations/providers?tab=directorio');
  }, [router]);

  return null;
}
