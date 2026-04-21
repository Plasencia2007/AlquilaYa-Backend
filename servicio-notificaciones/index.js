const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const KafkaConsumer = require('./KafkaConsumer');
const app = express();
const port = 8081;

app.use(express.json());

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

// QR Code Generation
client.on('qr', (qr) => {
    console.log('\n==================================================================');
    console.log('ESCANEAME PARA VINCULAR ALQUILAYA WHATSAPP:');
    console.log('==================================================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n==================================================================\n');
});

// Client Ready
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
    client.initialize(); // Retry
});

// Start Client
client.initialize();

// API Endpoint to send OTP
app.post('/api/v1/notifications/whatsapp/send-otp', async (req, res) => {
    const { telefono, codigo } = req.body;

    if (!isReady) {
        return res.status(503).json({ error: 'WhatsApp service is not ready yet. Please wait for QR scan.' });
    }

    if (!telefono || !codigo) {
        return res.status(400).json({ error: 'Telefono and codigo are required' });
    }

    try {
        // Format phone number (ensure it has @c.us suffix)
        // react-phone-number-input usually gives +51999888777
        let number = telefono.replace('+', '').replace(' ', '');
        if (!number.endsWith('@c.us')) {
            number = `${number}@c.us`;
        }

        const message = `*AlquilaYa* 🏠\n\nTu código de verificación es: *${codigo}*\n\nNo compartas este código con nadie. Expira en 5 minutos.`;
        
        await client.sendMessage(number, message);
        console.log(`OTP sent to ${telefono}: ${codigo}`);
        
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
});

// API Endpoint to send generic message
app.post('/api/v1/notifications/whatsapp/send-message', async (req, res) => {
    const { telefono, mensaje } = req.body;

    if (!isReady) {
        return res.status(503).json({ error: 'WhatsApp service is not ready yet.' });
    }

    if (!telefono || !mensaje) {
        return res.status(400).json({ error: 'Telefono and mensaje are required' });
    }

    try {
        let number = telefono.replace('+', '').replace(' ', '');
        if (!number.endsWith('@c.us')) {
            number = `${number}@c.us`;
        }

        await client.sendMessage(number, mensaje);
        console.log(`Message sent to ${telefono}`);
        
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
});

app.get('/api/v1/notifications/status', (req, res) => {
    res.json({ ready: isReady });
});

app.listen(port, () => {
    console.log(`Notification Service running on port ${port}`);
});
