import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Regístrate gratis en AlquilaYa — encuentra tu cuarto cerca de tu universidad';

/**
 * OG image propia de /register (ítem 199): sin esto, Next hereda el genérico de la raíz
 * (`app/opengraph-image.tsx`) — funciona, pero un copy específico convierte mejor al
 * compartirse en grupos de WhatsApp de cachimbos (público objetivo real de esta ruta).
 * Mismo estilo/gradiente de marca que el resto de imágenes OG generadas del proyecto.
 */
export default function RegisterOpengraphImage() {
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
            fontSize: 80,
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
            marginTop: 20,
            fontSize: 40,
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          Encuentra tu cuarto cerca de tu universidad
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 16,
            fontSize: 28,
            fontWeight: 500,
            color: '#e5dfdc',
          }}
        >
          Regístrate gratis en menos de 2 minutos
        </div>
      </div>
    ),
    { ...size },
  );
}
