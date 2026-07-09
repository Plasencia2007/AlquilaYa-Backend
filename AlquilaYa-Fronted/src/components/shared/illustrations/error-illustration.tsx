import type { SVGProps } from 'react';
import { IllustrationBase } from './base';

/** Escudo con signo de exclamación — para pantallas de error. */
export function ErrorIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustrationBase {...props}>
      <path
        d="M80 36 L114 50 V78 C114 100 100 116 80 124 C60 116 46 100 46 78 V50 Z"
        className="stroke-destructive"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M80 62 V86"
        className="stroke-destructive"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <circle cx="80" cy="100" r="2.6" className="fill-destructive" />
    </IllustrationBase>
  );
}
