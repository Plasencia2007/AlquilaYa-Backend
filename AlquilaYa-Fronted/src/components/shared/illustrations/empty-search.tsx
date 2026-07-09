import type { SVGProps } from 'react';
import { IllustrationBase } from './base';

/** Lupa con un hueco vacío dentro — para "sin resultados". */
export function EmptySearchIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustrationBase {...props}>
      <circle cx="72" cy="68" r="30" className="stroke-primary" strokeWidth={4} />
      <circle
        cx="72"
        cy="68"
        r="12"
        className="stroke-primary/40"
        strokeWidth={2.5}
        strokeDasharray="4 5"
      />
      <path
        d="M94 90 L118 114"
        className="stroke-primary"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </IllustrationBase>
  );
}
