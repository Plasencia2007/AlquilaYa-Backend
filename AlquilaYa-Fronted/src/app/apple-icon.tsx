import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** apple-touch-icon (ítem 28) — iOS no acepta transparencia ni esquinas redondeadas
 * propias, así que va a fondo completo (el sistema le aplica su propia máscara). */
export default function AppleIcon() {
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
          color: '#f2ede9',
          fontSize: 96,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        A
      </div>
    ),
    { ...size },
  );
}
