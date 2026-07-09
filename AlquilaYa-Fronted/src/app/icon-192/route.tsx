import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/** Ícono 192×192 para el manifest PWA (ítem 28). */
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
          borderRadius: 40,
          color: '#f2ede9',
          fontSize: 120,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        A
      </div>
    ),
    { width: 192, height: 192 },
  );
}
