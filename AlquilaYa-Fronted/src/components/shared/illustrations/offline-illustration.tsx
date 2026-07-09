import type { SVGProps } from 'react';
import { IllustrationBase } from './base';

/** Nube tachada — para estados sin conexión. */
export function OfflineIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustrationBase {...props}>
      <path
        d="M54 92 C42 92 34 83 34 72 C34 61 42 53 52 52 C55 40 66 32 79 32 C93 32 105 42 107 55 C117 56 125 65 125 76 C125 87 116 96 105 96 H54 Z"
        className="stroke-primary"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M36 40 L124 112"
        className="stroke-destructive"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
    </IllustrationBase>
  );
}
