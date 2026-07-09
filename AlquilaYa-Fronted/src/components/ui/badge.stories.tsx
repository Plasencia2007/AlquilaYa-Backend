import { Badge } from './badge';

export default {
  title: 'ui / Badge',
};

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="default">Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="destructive">Destructive</Badge>
  </div>
);

/** El semáforo (success/warning/info) no tiene variant propio en el Badge base —
 * se compone a mano con los tokens, como se hace en property-badges.tsx. */
export const Semaforo = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge className="border-transparent bg-success text-success-foreground">Rebaja</Badge>
    <Badge className="border-transparent bg-warning text-warning-foreground">Popular</Badge>
    <Badge className="border-transparent bg-info text-info-foreground">Info</Badge>
  </div>
);
