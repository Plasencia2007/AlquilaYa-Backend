import { ImageResponse } from 'next/og';

export const alt = 'AlquilaYa — cuartos para estudiantes UPeU';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Fallback de OG image (ítem 152) para propiedades sin fotos: en vez de compartir sin
 * imagen, generamos una tarjeta de marca en el momento. `layout.tsx` omite `openGraph.
 * images`/`twitter.images` cuando no hay foto, dejando que Next.js use este archivo
 * automáticamente (file convention `opengraph-image`).
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #8f0304 0%, #5c0202 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: 28,
            background: 'rgba(255,255,255,0.15)',
            marginBottom: 32,
            fontSize: 64,
          }}
        >
          🏠
        </div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, color: '#ffffff' }}>
          AlquilaYa
        </div>
        <div style={{ display: 'flex', fontSize: 32, color: 'rgba(255,255,255,0.85)', marginTop: 16 }}>
          Cuartos para estudiantes cerca de tu universidad
        </div>
      </div>
    ),
    { ...size },
  );
}
