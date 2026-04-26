import { NextResponse } from 'next/server';

/**
 * Proxy API para leer los logs reales del backend vía Actuator.
 */
export async function GET() {
  try {
    // Apuntamos al logfile del Gateway (URL server-side, no expuesta al browser)
    const backend = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080';
    const logUrl = `${backend}/actuator/logfile`;
    
    const response = await fetch(logUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ 
          logs: "[ERROR] Endpoint /actuator/logfile no encontrado. ¿Está configurado logging.file.name?" 
        }, { status: 404 });
      }
      throw new Error(`Failed to fetch logs: ${response.status}`);
    }

    const text = await response.text();
    
    // Procesamos para enviar solo las últimas N líneas (ej. últimas 100)
    // Esto evita que el frontend se sature con archivos de log gigantes
    const lines = text.split('\n');
    const lastLines = lines.slice(-100).join('\n');

    return NextResponse.json({ logs: lastLines });
    
  } catch (error: any) {
    console.error('Error in Logs Proxy:', error);
    return NextResponse.json(
      { logs: `[SISTEMA] No hay conexión con el flujo de logs: ${error.message}` },
      { status: 500 }
    );
  }
}
