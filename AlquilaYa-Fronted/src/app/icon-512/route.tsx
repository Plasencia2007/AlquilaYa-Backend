import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/** Ícono 512×512 para el manifest PWA (ítem 28). */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#8f0304',
          borderRadius: 108,
          color: '#f2ede9',
          fontSize: 320,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        A
      </div>
    ),
    { width: 512, height: 512 },
  );
}
