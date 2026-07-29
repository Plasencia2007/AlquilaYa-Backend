'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLandlordPropertyFilter } from '@/hooks/use-landlord-property-filter';
import { TODAS_LAS_PROPIEDADES } from '@/stores/landlord-property-filter-store';

interface LandlordPropertySwitcherProps {
  className?: string;
}

/**
 * Ítem 344: selector global de propiedad ("workspace switcher") del panel arrendador. Reemplaza
 * los `<Select>` locales que `finances/monthly` y `finances/per-room` tenían cada uno por su
 * cuenta — mismo componente, mismo estado central (`use-landlord-property-filter`), para que la
 * selección persista al navegar entre esas páginas y quede reflejada en la URL de la página activa.
 */
export function LandlordPropertySwitcher({ className }: LandlordPropertySwitcherProps) {
  const { propiedadId, propiedades, cambiarPropiedad } = useLandlordPropertyFilter();

  return (
    <Select value={propiedadId} onValueChange={cambiarPropiedad}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Todas las propiedades" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODAS_LAS_PROPIEDADES}>Todas las propiedades</SelectItem>
        {propiedades.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.titulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
