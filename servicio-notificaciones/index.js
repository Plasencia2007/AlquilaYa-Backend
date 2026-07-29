// Carga variables desde el .env de la raíz del repo (un nivel arriba).
// En Docker/prod el archivo no existe y dotenv simplemente no hace nada — las vars
// se inyectan vía `-e` o env_file del orquestador.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const KafkaConsumer = require('./KafkaConsumer');
const logger = require('./src/lib/logger');
const {
    recordAudit, getAudit, getLastSuccess, pingWithTimeout, isConnected: isRedisConnected,
} = require('./src/lib/redisClient');

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 8081;

// Secret compartido con los servicios Java. En prod debe estar seteado;
// si falta, el servicio arranca pero rechaza todo request autenticado.
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
if (!INTERNAL_API_KEY) {
    logger.warn('INTERNAL_API_KEY no configurado. Los endpoints de envio rechazaran todas las llamadas.');
}

// Red de seguridad: en Node 20 un unhandledRejection no capturado termina el proceso por
// defecto, tumbando también el servidor HTTP y el consumer de Kafka (no solo WhatsApp).
// Solo logueamos — nunca process.exit() aquí — para no repetir el mismo problema que
// estamos parcheando en client.initialize() (ver más abajo) para cualquier otra promesa
// que se nos haya escapado sin .catch().
process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection no capturado', {
        error: reason && reason.message ? reason.message : String(reason),
        stack: reason && reason.stack,
    });
});

// Formato E.164 Perú: +51 + 9 dígitos.
const PHONE_REGEX = /^\+?51\d{9}$/;
// El OTP siempre se genera con 6 dígitos (usuarios: String.format("%06d", ...)). Exigir exactamente 6.
const OTP_REGEX = /^\d{6}$/;

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '16kb' }));

// Rate-limit global (defensa básica).
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
app.use(globalLimiter);

// Rate-limit estricto para endpoints de envío (anti-spam / anti-abuso).
const sendLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    keyGenerator: (req) => `${req.ip}:${req.body && req.body.telefono ? req.body.telefono : ''}`,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes; espera un minuto.' },
});

function requireApiKey(req, res, next) {
    const key = req.get('x-api-key');
    if (!INTERNAL_API_KEY || !key || key !== INTERNAL_API_KEY) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    next();
}

function normalizarTelefono(raw) {
    return String(raw).replace(/\s+/g, '').replace(/^\+/, '');
}

// Estado en memoria para /health.
let isReady = false;
let lastSuccessAt = null;
let kafkaConnected = false;
let kafkaConsumerRef = null;

function markSuccess() {
    lastSuccessAt = new Date().toISOString();
}

// WhatsApp Client
const client = new Client({
    // En prod, WWEBJS_DATA_PATH apunta al volumen montado (/home/app/.wwebjs_auth) para que la
    // sesión persista y NO haya que re-escanear el QR en cada reinicio (I6). En dev queda vacío
    // → LocalAuth usa su default (<cwd>/.wwebjs_auth), como siempre.
    authStrategy: new LocalAuth(
        process.env.WWEBJS_DATA_PATH ? { dataPath: process.env.WWEBJS_DATA_PATH } : {}
    ),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    logger.info('Escanea el QR para vincular AlquilaYa WhatsApp');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    logger.info('WhatsApp Client READY');
    isReady = true;

    // Arrancar el consumidor Kafka UNA sola vez. En cada reconexión de WhatsApp
    // ('disconnected'→initialize→'ready') este handler vuelve a correr; sin este guard se
    // creaba un consumidor nuevo sin parar el anterior (fuga de consumidores en el mismo grupo).
    // El consumidor conserva la referencia a `client`, que sigue siendo válida tras reconectar.
    if (kafkaConsumerRef) {
        logger.info('Kafka Consumer ya activo (reconexión de WhatsApp); no se recrea.');
        return;
    }

    const consumer = new KafkaConsumer(client, {
        onStateChange: (connected) => { kafkaConnected = connected; },
    });
    try {
        await consumer.start();
        kafkaConsumerRef = consumer; // solo tras arranque exitoso → si falla, el próximo 'ready' reintenta
        logger.info('Kafka Consumer started successfully');
    } catch (err) {
        logger.error('Error starting Kafka Consumer', { error: err && err.message });
    }
});

client.on('authenticated', () => {
    logger.info('WhatsApp Authenticated');
});

client.on('auth_failure', (msg) => {
    logger.error('WhatsApp AUTHENTICATION FAILURE', { message: msg });
});

client.on('disconnected', (reason) => {
    logger.warn('WhatsApp Client logged out', { reason });
    isReady = false;
    client.initialize().catch((err) => {
        logger.error('Error al reinicializar WhatsApp Client tras desconexion', { error: err && err.message });
    });
});

client.initialize().catch((err) => {
    logger.error('Error al inicializar WhatsApp Client', { error: err && err.message });
});

// --- API ---

app.post('/api/v1/notifications/whatsapp/send-otp', sendLimiter, requireApiKey, async (req, res) => {
    const { telefono, codigo } = req.body || {};

    if (!isReady) {
        return res.status(503).json({ error: 'WhatsApp service is not ready yet.' });
    }
    if (!telefono || !PHONE_REGEX.test(String(telefono))) {
        return res.status(400).json({ error: 'Teléfono inválido (formato esperado +51XXXXXXXXX)' });
    }
    if (!codigo || !OTP_REGEX.test(String(codigo))) {
        return res.status(400).json({ error: 'Código inválido (4 a 6 dígitos)' });
    }

    const numeroLimpio = normalizarTelefono(telefono);
    const maskedPhone = String(telefono).replace(/\d(?=\d{4})/g, '*');
    try {
        const numberId = await client.getNumberId(numeroLimpio);
        if (!numberId) {
            logger.warn('Numero sin WhatsApp', { phone: maskedPhone, eventType: 'OTP' });
            await recordAudit(numeroLimpio, { event: 'OTP', success: false, errorIfAny: 'No WhatsApp account' });
            return res.status(400).json({
                error: 'Este número no tiene WhatsApp activo. Verifica el número o usa otro con WhatsApp.'
            });
        }

        const message = `*AlquilaYa* 🏠\n\nTu código de verificación es: *${codigo}*\n\nNo compartas este código con nadie. Expira en 5 minutos.`;
        await client.sendMessage(numberId._serialized, message);
        logger.info('OTP enviado', { phone: maskedPhone, eventType: 'OTP' });
        markSuccess();
        await recordAudit(numeroLimpio, { event: 'OTP', success: true });
        res.json({ success: true });
    } catch (error) {
        logger.error('Error sending WhatsApp OTP', { phone: maskedPhone, error: error && error.message });
        await recordAudit(numeroLimpio, { event: 'OTP', success: false, errorIfAny: error && error.message });
        res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
});

app.post('/api/v1/notifications/whatsapp/send-message', sendLimiter, requireApiKey, async (req, res) => {
    const { telefono, mensaje } = req.body || {};

    if (!isReady) {
        return res.status(503).json({ error: 'WhatsApp service is not ready yet.' });
    }
    if (!telefono || !PHONE_REGEX.test(String(telefono))) {
        return res.status(400).json({ error: 'Teléfono inválido' });
    }
    if (typeof mensaje !== 'string' || mensaje.length === 0 || mensaje.length > 4096) {
        return res.status(400).json({ error: 'Mensaje inválido (1–4096 caracteres)' });
    }

    const numeroLimpio = normalizarTelefono(telefono);
    const maskedPhone = String(telefono).replace(/\d(?=\d{4})/g, '*');
    try {
        const numberId = await client.getNumberId(numeroLimpio);
        if (!numberId) {
            logger.warn('Numero sin WhatsApp', { phone: maskedPhone, eventType: 'MESSAGE' });
            await recordAudit(numeroLimpio, { event: 'MESSAGE', success: false, errorIfAny: 'No WhatsApp account' });
            return res.status(400).json({ error: 'El número destino no tiene WhatsApp activo' });
        }
        await client.sendMessage(numberId._serialized, mensaje);
        logger.info('Mensaje WhatsApp enviado', { phone: maskedPhone, eventType: 'MESSAGE' });
        markSuccess();
        await recordAudit(numeroLimpio, { event: 'MESSAGE', success: true });
        res.json({ success: true });
    } catch (error) {
        logger.error('Error sending WhatsApp message', { phone: maskedPhone, error: error && error.message });
        await recordAudit(numeroLimpio, { event: 'MESSAGE', success: false, errorIfAny: error && error.message });
        res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
});

// Status: público (usado como healthcheck por otros servicios). Retro-compatible.
app.get('/api/v1/notifications/status', (req, res) => {
    res.json({ ready: isReady });
});

// Audit trail: ultimos eventos por telefono. Protegido por x-api-key.
app.get('/api/v1/notifications/audit/:phone', requireApiKey, async (req, res) => {
    const rawPhone = req.params.phone || '';
    if (!PHONE_REGEX.test(rawPhone)) {
        return res.status(400).json({ error: 'Teléfono inválido (formato esperado +51XXXXXXXXX)' });
    }
    const phoneKey = normalizarTelefono(rawPhone);
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    try {
        const events = await getAudit(phoneKey, limit);
        res.json({ phone: phoneKey, count: events.length, events });
    } catch (err) {
        logger.error('Error leyendo audit', { error: err && err.message });
        res.status(500).json({ error: 'No se pudo obtener el audit trail' });
    }
});

// Healthcheck enriquecido. 200 si OK, 503 si critico (whatsapp o kafka caidos).
app.get('/health', async (req, res) => {
    const [redisOk, lastSuccessRedis] = await Promise.all([
        pingWithTimeout(1000),
        getLastSuccess(),
    ]);

    const effectiveLastSuccess = lastSuccessAt
        || (lastSuccessRedis && lastSuccessRedis.timestamp)
        || null;

    const body = {
        ready: isReady, // mantenemos campo legacy
        whatsapp: {
            connected: isReady,
            lastSuccessAt: effectiveLastSuccess,
        },
        kafka: {
            connected: !!kafkaConnected,
        },
        redis: {
            connected: redisOk && isRedisConnected(),
        },
        timestamp: new Date().toISOString(),
    };

    const critical = body.whatsapp.connected && body.kafka.connected;
    res.status(critical ? 200 : 503).json(body);
});

const server = app.listen(port, () => {
    logger.info('Notification Service running', { port });
});

// Graceful shutdown
async function shutdown(signal) {
    logger.info('Shutting down', { signal });
    server.close(() => {});
    try { if (kafkaConsumerRef) await kafkaConsumerRef.stop(); } catch { /* noop */ }
    try { await client.destroy(); } catch { /* noop */ }
    process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
