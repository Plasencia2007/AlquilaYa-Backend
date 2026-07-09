import { Heart, MessageCircleOff, SearchX } from 'lucide-react';
import { EmptyState } from './empty-state';

export default {
  title: 'shared / EmptyState',
};

export const SinFavoritos = () => (
  <EmptyState
    icon={Heart}
    title="Aún no tienes favoritos"
    description="Guarda los cuartos que te interesen para comparar y decidir después."
    action={{ type: 'button', label: 'Explorar cuartos', onClick: () => {} }}
  />
);

export const SinMensajes = () => (
  <EmptyState
    icon={MessageCircleOff}
    title="Sin conversaciones todavía"
    description="Cuando contactes a un arrendador, la conversación aparecerá aquí."
  />
);

export const SinResultados = () => (
  <EmptyState
    icon={SearchX}
    title="Sin resultados"
    description="No encontramos cuartos con esos filtros — prueba ajustando el rango de precio."
    action={{ type: 'button', label: 'Limpiar filtros', onClick: () => {} }}
  />
);
