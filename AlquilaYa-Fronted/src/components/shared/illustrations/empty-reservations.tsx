import type { SVGProps } from 'react';
import { IllustrationBase } from './base';

/** Casita con puerta — para "aún no tienes reservas". */
export function EmptyReservationsIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustrationBase {...props}>
      <path
        d="M42 74 L80 44 L118 74"
        className="stroke-primary"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52 66 V116 H108 V66"
        className="stroke-primary"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="72" y="88" width="16" height="28" rx="2" className="stroke-primary" strokeWidth={3} />
      <circle cx="82" cy="102" r="1.6" className="fill-primary" />
      <path
        d="M32 100 h10 M118 100 h10"
        className="stroke-border"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </IllustrationBase>
  );
}
