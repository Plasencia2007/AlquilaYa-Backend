import { NextResponse } from 'next/server';

/**
 * Proxy API para Actuator Health.
 * Esto evita errores de CORS ya que la petición se realiza de servidor (Next.js) a servidor (Gateway).
 */
export async function GET() {
  try {
    const backend = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080';
    const backendUrl = `${backend}/actuator/health`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Desactivamos caché para tener datos en tiempo real
      cache: 'no-store',
    });

    if (!response.ok) {
      // Si el backend responde con error, lo pasamos al frontend para que el adminService lo maneje
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Error in Health Proxy:', error);
    return NextResponse.json(
      { status: 'DOWN', error: 'Could not connect to Gateway' },
      { status: 503 }
    );
  }
}
