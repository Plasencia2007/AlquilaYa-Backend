import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'AlquilaYa — Encuentra tu cuarto ideal cerca de tu universidad';

/**
 * Imagen OG por defecto (raíz). Next la hereda automáticamente en cualquier
 * ruta que no defina su propia `openGraph.images` (property/[id] sí define
 * la suya con la foto real de cada propiedad — ver su layout.tsx).
 */
export default function DefaultOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #3d0102 0%, #8f0304 55%, #9d0303 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontSize: 96,
            fontWeight: 800,
            color: '#f2ede9',
            letterSpacing: '-0.04em',
          }}
        >
          Alquila
          <span style={{ color: '#d07577' }}>Ya</span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 32,
            fontWeight: 500,
            color: '#e5dfdc',
          }}
        >
          Cuartos verificados cerca de tu universidad
        </div>
      </div>
    ),
    { ...size },
  );
}
