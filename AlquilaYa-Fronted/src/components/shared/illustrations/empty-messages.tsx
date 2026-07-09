import type { SVGProps } from 'react';
import { IllustrationBase } from './base';

/** Burbuja de chat vacía con tres puntos suaves — para "sin conversaciones". */
export function EmptyMessagesIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustrationBase {...props}>
      <rect
        x="36"
        y="38"
        width="88"
        height="60"
        rx="18"
        className="stroke-primary"
        strokeWidth={3.5}
      />
      <path
        d="M58 98 L52 116 L74 98"
        className="stroke-primary"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="62" cy="68" r="4" className="fill-border" />
      <circle cx="80" cy="68" r="4" className="fill-border" />
      <circle cx="98" cy="68" r="4" className="fill-border" />
    </IllustrationBase>
  );
}
