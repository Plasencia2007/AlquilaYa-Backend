import {
  EmptyFavoritesIllustration,
  EmptyMessagesIllustration,
  EmptyReservationsIllustration,
  EmptySearchIllustration,
  ErrorIllustration,
  OfflineIllustration,
} from './index';

export default {
  title: 'shared / Illustrations',
};

export const Galeria = () => (
  <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
    {[
      ['Favoritos vacíos', EmptyFavoritesIllustration],
      ['Sin mensajes', EmptyMessagesIllustration],
      ['Sin reservas', EmptyReservationsIllustration],
      ['Sin resultados', EmptySearchIllustration],
      ['Error', ErrorIllustration],
      ['Sin conexión', OfflineIllustration],
    ].map(([label, Ilustracion]) => {
      const Comp = Ilustracion as React.ComponentType<{ className?: string }>;
      return (
        <div key={label as string} className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4">
          <Comp className="size-28" />
          <p className="text-xs font-semibold text-muted-foreground">{label as string}</p>
        </div>
      );
    })}
  </div>
);
