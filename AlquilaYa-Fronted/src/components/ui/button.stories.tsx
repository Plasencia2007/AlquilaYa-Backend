import { Heart } from 'lucide-react';
import { Button } from './button';

export default {
  title: 'ui / Button',
};

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="default">Default</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="link">Link</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
    <Button size="icon" aria-label="Favorito">
      <Heart className="size-4" />
    </Button>
  </div>
);

export const Disabled = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button disabled>Default</Button>
    <Button variant="outline" disabled>Outline</Button>
  </div>
);
