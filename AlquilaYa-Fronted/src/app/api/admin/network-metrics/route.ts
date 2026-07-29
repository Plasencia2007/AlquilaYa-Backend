import { NextResponse } from 'next/server';

/**
 * Proxy API para métricas de red reales vía Prometheus (evita CORS, igual que
 * `api/admin/health` y `api/admin/logs`).
 *
 * IMPORTANTE: Prometheus corre en un stack Docker Compose SEPARADO y OPCIONAL
 * (`docker-compose.observability.yml`, puerto 9090) — a diferencia del Actuator del
 * gateway (que sí es parte del stack principal), NO está garantizado que esté
 * arriba en todos los entornos. Por eso esta ruta nunca lanza un 500 genérico: si
 * Prometheus no responde (timeout, connection refused, lo que sea) devuelve
 * `{ disponible: false, motivo }` con status 200 — es un estado esperado del
 * sistema, no un error del proxy.
 */

const PROMETHEUS_TIMEOUT_MS = 4000;

// Mapea el label `service` (tal como lo pone `monitoring/prometheus/prometheus.yml`)
// a un nombre corto para el eje X de los charts.
const SERVICE_LABELS: Record<string, string> = {
  'api-gateway': 'Gateway',
  'servicio-usuarios': 'Usuarios',
  'servicio-propiedades': 'Propiedades',
  'servicio-pagos': 'Pagos',
  'servicio-catalogos': 'Catálogos',
  'servicio-mensajeria': 'Mensajería',
};

// Latencia media por servicio (ms), ventana de 5 min. clamp_min evita división por cero
// cuando un servicio no recibió tráfico en la ventana.
const QUERY_LATENCIA =
  'sum by (service) (rate(http_server_requests_seconds_sum[5m])) / clamp_min(sum by (service) (rate(http_server_requests_seconds_count[5m])), 0.001)';
// Tráfico (requests/seg) por servicio, ventana de 5 min.
const QUERY_TRAFICO = 'sum by (service) (rate(http_server_requests_seconds_count[5m]))';
// Conteo por código de status exacto (agrupamos en 2xx/5xx/otros nosotros abajo).
const QUERY_ESTADOS = 'sum by (status) (rate(http_server_requests_seconds_count[5m]))';

interface PrometheusInstantResult {
  metric: Record<string, string>;
  value: [number, string];
}

interface PrometheusQueryResponse {
  status: 'success' | 'error';
  data?: {
    resultType: string;
    result: PrometheusInstantResult[];
  };
  error?: string;
}

interface ServicioPunto {
  service: string;
  label: string;
}

interface LatenciaPunto extends ServicioPunto {
  ms: number;
}

interface TraficoPunto extends ServicioPunto {
  req: number;
}

interface EstadoPunto {
  name: string;
  value: number;
  color: string;
}

interface ResumenMetricas {
  latenciaMediaMs: number;
  peticionesPorSegundo: number;
  errores5xxPorcentaje: number;
  serviciosReportando: number;
  serviciosTotales: number;
}

interface NetworkMetricsResponse {
  disponible: boolean;
  motivo?: string;
  actualizadoEn?: string;
  latencia?: LatenciaPunto[];
  trafico?: TraficoPunto[];
  estados?: EstadoPunto[];
  resumen?: ResumenMetricas;
}

const nombreServicio = (service: string) => SERVICE_LABELS[service] ?? service;

async function consultarPrometheus(baseUrl: string, query: string): Promise<PrometheusQueryResponse> {
  const url = `${baseUrl}/api/v1/query?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    // Desactivamos caché para tener datos en tiempo real (mismo patrón que health/route.ts).
    cache: 'no-store',
    // Prometheus es opcional: si no está levantado, no queremos colgar la petición del panel.
    signal: AbortSignal.timeout(PROMETHEUS_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Prometheus respondió ${response.status}`);
  }

  const data = (await response.json()) as PrometheusQueryResponse;
  if (data.status !== 'success') {
    throw new Error(data.error || 'Prometheus devolvió status distinto de success');
  }
  return data;
}

export async function GET() {
  const prometheusUrl = (process.env.PROMETHEUS_URL || 'http://localhost:9090').replace(/\/$/, '');

  try {
    const [latenciaRes, traficoRes, estadosRes] = await Promise.all([
      consultarPrometheus(prometheusUrl, QUERY_LATENCIA),
      consultarPrometheus(prometheusUrl, QUERY_TRAFICO),
      consultarPrometheus(prometheusUrl, QUERY_ESTADOS),
    ]);

    const latencia: LatenciaPunto[] = (latenciaRes.data?.result ?? [])
      .map((r) => {
        const service = r.metric.service ?? 'desconocido';
        return {
          service,
          label: nombreServicio(service),
          // http_server_requests_seconds_* está en segundos -> lo pasamos a ms.
          ms: Math.round(Number(r.value[1]) * 1000 * 10) / 10,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const trafico: TraficoPunto[] = (traficoRes.data?.result ?? [])
      .map((r) => {
        const service = r.metric.service ?? 'desconocido';
        return {
          service,
          label: nombreServicio(service),
          req: Math.round(Number(r.value[1]) * 100) / 100,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const contador = { exito: 0, error: 0, otros: 0 };
    for (const r of estadosRes.data?.result ?? []) {
      const status = r.metric.status ?? '';
      const valor = Number(r.value[1]);
      if (!Number.isFinite(valor) || valor <= 0) continue;
      if (status.startsWith('2')) contador.exito += valor;
      else if (status.startsWith('5')) contador.error += valor;
      else contador.otros += valor;
    }
    const totalEstados = contador.exito + contador.error + contador.otros;
    const porcentaje = (v: number) => (totalEstados > 0 ? Math.round((v / totalEstados) * 1000) / 10 : 0);

    const estados: EstadoPunto[] = [
      { name: 'Éxito (2xx)', value: porcentaje(contador.exito), color: '#10b981' },
      { name: 'Errores (5xx)', value: porcentaje(contador.error), color: '#ef4444' },
      { name: 'Otros', value: porcentaje(contador.otros), color: '#94a3b8' },
    ];

    const peticionesPorSegundo = Math.round(trafico.reduce((acc, t) => acc + t.req, 0) * 100) / 100;
    // Latencia media global ponderada por tráfico (no un simple promedio entre servicios):
    // sum(ms_i * req_i) / sum(req_i) equivale a tiempo_total / peticiones_totales.
    const sumaPonderada = latencia.reduce((acc, l) => {
      const t = trafico.find((x) => x.service === l.service);
      return acc + l.ms * (t?.req ?? 0);
    }, 0);
    const latenciaMediaMs = peticionesPorSegundo > 0 ? Math.round((sumaPonderada / peticionesPorSegundo) * 10) / 10 : 0;

    const serviciosDetectados = new Set([...latencia.map((l) => l.service), ...trafico.map((t) => t.service)]);

    const respuesta: NetworkMetricsResponse = {
      disponible: true,
      actualizadoEn: new Date().toISOString(),
      latencia,
      trafico,
      estados,
      resumen: {
        latenciaMediaMs,
        peticionesPorSegundo,
        errores5xxPorcentaje: porcentaje(contador.error),
        serviciosReportando: serviciosDetectados.size,
        serviciosTotales: Object.keys(SERVICE_LABELS).length,
      },
    };

    return NextResponse.json(respuesta);
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    console.error('Error consultando Prometheus (network-metrics):', err?.message ?? error);
    const motivo =
      err?.name === 'TimeoutError' || err?.name === 'AbortError'
        ? 'Prometheus no respondió a tiempo.'
        : 'No se pudo conectar con Prometheus.';

    // Status 200 a propósito: Prometheus caído es un estado ESPERADO (stack opcional), no un
    // error del proxy — el frontend no debería tratarlo como un fallo de red.
    return NextResponse.json<NetworkMetricsResponse>({ disponible: false, motivo }, { status: 200 });
  }
}
