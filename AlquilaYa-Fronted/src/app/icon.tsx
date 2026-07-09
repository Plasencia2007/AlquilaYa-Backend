import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** Favicon dinámico (ítem 28) — wired automáticamente por Next a <link rel="icon">. */
export default function Icon() {
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
          borderRadius: 7,
          color: '#f2ede9',
          fontSize: 22,
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
