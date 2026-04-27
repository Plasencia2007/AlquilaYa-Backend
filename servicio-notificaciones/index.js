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

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 8081;

// Secret compartido con los servicios Java. En prod debe estar seteado;
// si falta, el servicio arranca pero rechaza todo request autenticado.
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
if (!INTERNAL_API_KEY) {
    console.warn('⚠️  INTERNAL_API_KEY no configurado. Los endpoints de envío rechazarán todas las llamadas.');
}

// Formato E.164 Perú: +51 + 9 dígitos.
const PHONE_REGEX = /^\+?51\d{9}$/;
const OTP_REGEX = /^\d{4,6}$/;

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

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

client.on('qr', (qr) => {
    console.log('\n==================================================================');
    console.log('ESCANEAME PARA VINCULAR ALQUILAYA WHATSAPP:');
    console.log('==================================================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n==================================================================\n');
});

client.on('ready', async () => {
    console.log('WhatsApp Client is READY!');
    isReady = true;

    const kafkaConsumer = new KafkaConsumer(client);
    try {
        await kafkaConsumer.start();
        console.log('Kafka Consumer started successfully');
    } catch (err) {
        console.error('Error starting Kafka Consumer:', err.message);
    }
});

client.on('authenticated', () => {
    console.log('WhatsApp Authenticated!');
});

client.on('auth_failure', (msg) => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was logged out', reason);
    isReady = false;
    client.initialize();
});

client.initialize();

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

    try {
        const numeroLimpio = normalizarTelefono(telefono);
        // Verificar que el numero tenga WhatsApp ANTES de intentar enviar.
        // getNumberId devuelve null si no esta registrado en WhatsApp.
        const numberId = await client.getNumberId(numeroLimpio);
        if (!numberId) {
            console.warn(`Numero sin WhatsApp: ${numeroLimpio}`);
            return res.status(400).json({
                error: 'Este número no tiene WhatsApp activo. Verifica el número o usa otro con WhatsApp.'
            });
        }

        const message = `*AlquilaYa* 🏠\n\nTu código de verificación es: *${codigo}*\n\nNo compartas este código con nadie. Expira en 5 minutos.`;
        await client.sendMessage(numberId._serialized, message);
        console.log('OTP enviado');
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending WhatsApp OTP:', error && error.message);
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

    try {
        const numeroLimpio = normalizarTelefono(telefono);
        const numberId = await client.getNumberId(numeroLimpio);
        if (!numberId) {
            console.warn(`Numero sin WhatsApp: ${numeroLimpio}`);
            return res.status(400).json({ error: 'El número destino no tiene WhatsApp activo' });
        }
        await client.sendMessage(numberId._serialized, mensaje);
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error && error.message);
        res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
});

// Status: público (usado como healthcheck por otros servicios).
app.get('/api/v1/notifications/status', (req, res) => {
    res.json({ ready: isReady });
});

app.listen(port, () => {
    console.log(`Notification Service running on port ${port}`);
});
