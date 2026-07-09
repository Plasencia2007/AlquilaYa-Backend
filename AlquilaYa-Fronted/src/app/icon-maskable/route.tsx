import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * Variante maskable (ítem 28): Android recorta el ícono con su propia máscara
 * (círculo, squircle, etc.), así que el fondo va edge-to-edge sin bordes
 * redondeados propios, y la "A" se reduce para caber en la zona segura
 * (~66% central) sin que ningún mask la corte.
 */
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
          color: '#f2ede9',
          fontSize: 200,
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
