import type { SVGProps } from 'react';
import { IllustrationBase } from './base';

/** Corazón "vacío" (trazo discontinuo) — para favoritos sin guardar. */
export function EmptyFavoritesIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustrationBase {...props}>
      <path
        d="M80 112 C80 112 44 89 44 63 C44 48 56 38 69 43 C75 45 78 51 80 56 C82 51 85 45 91 43 C104 38 116 48 116 63 C116 89 80 112 80 112 Z"
        className="stroke-primary/40"
        strokeWidth={3}
        strokeDasharray="6 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M80 100 C80 100 54 84 54 65 C54 54 63 47 72 51 C76 53 78 57 80 61"
        className="stroke-primary"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="118" cy="46" r="4" className="fill-warning" />
      <circle cx="34" cy="58" r="3" className="fill-warning/70" />
    </IllustrationBase>
  );
}
