const { Kafka } = require('kafkajs');
const logger = require('./src/lib/logger');
const { recordAudit } = require('./src/lib/redisClient');

const DLQ_SUFFIX = '-dlq';
const MAX_ATTEMPTS = 3;
// Backoff exponencial: 1s, 5s, 15s
const BACKOFF_MS = [1000, 5000, 15000];

/**
 * Kafka Consumer — escucha user-approval-events y reserva-events y los traduce a mensajes WhatsApp.
 * Implementa reintentos con backoff exponencial y publica a un topic DLQ si supera MAX_ATTEMPTS.
 */
class KafkaConsumer {
    constructor(whatsappClient, opts = {}) {
        this.client = whatsappClient;
        // Soporta lista separada por comas (p.ej. "kafka-1:9092,kafka-2:9092").
        const brokers = (process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092')
            .split(',')
            .map((b) => b.trim())
            .filter(Boolean);
        this.kafka = new Kafka({
            clientId: 'notification-service',
            brokers,
        });

        this.consumer = this.kafka.consumer({ groupId: 'alquilaya-group' });
        this.producer = this.kafka.producer();
        this.connected = false;
        this.onStateChange = typeof opts.onStateChange === 'function' ? opts.onStateChange : null;

        // KafkaJS expone eventos en consumer.events.*
        this.consumer.on(this.consumer.events.CONNECT, () => {
            this.connected = true;
            logger.info('Kafka consumer connected');
            if (this.onStateChange) this.onStateChange(true);
        });
        this.consumer.on(this.consumer.events.DISCONNECT, () => {
            this.connected = false;
            logger.warn('Kafka consumer disconnected');
            if (this.onStateChange) this.onStateChange(false);
        });
        this.consumer.on(this.consumer.events.CRASH, (event) => {
            this.connected = false;
            logger.error('Kafka consumer crashed', { error: event && event.payload && event.payload.error && event.payload.error.message });
            if (this.onStateChange) this.onStateChange(false);
        });
    }

    isConnected() {
        return this.connected;
    }

    async start() {
        logger.info('Starting Kafka Consumer in Notification Service');

        await this.producer.connect();
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'user-approval-events', fromBeginning: false });
        await this.consumer.subscribe({ topic: 'reserva-events', fromBeginning: false });

        // autoCommit: false + commit explícito por mensaje = al-menos-una-vez.
        // Los handlers deben tolerar re-entrega (idempotencia) si hay reinicios a mitad de proceso.
        await this.consumer.run({
            autoCommit: false,
            eachMessage: async ({ topic, partition, message }) => {
                const rawValue = message.value ? message.value.toString() : '';
                const offset = message.offset;
                logger.debug('Kafka message received', { topic, partition, kafkaOffset: offset });

                let event = null;
                try {
                    event = JSON.parse(rawValue);
                } catch (err) {
                    logger.error('Mensaje mal formado, se descarta', {
                        topic, partition, kafkaOffset: offset, error: err && err.message,
                    });
                    // Mandar al DLQ por payload invalido tambien.
                    await this._publishToDlq(topic, partition, offset, rawValue, 'Invalid JSON payload', 1);
                    await this._commit(topic, partition, offset);
                    return;
                }

                const result = await this._processWithRetries(topic, partition, offset, event, rawValue);
                if (!result.ok) {
                    // Tras agotar reintentos, mandar a DLQ y commitear para no bloquear.
                    await this._publishToDlq(
                        topic, partition, offset, rawValue,
                        result.lastError, result.attempts
                    );
                }
                await this._commit(topic, partition, offset);
            },
        });
    }

    async stop() {
        try { await this.consumer.disconnect(); } catch { /* noop */ }
        try { await this.producer.disconnect(); } catch { /* noop */ }
        this.connected = false;
    }

    async _processWithRetries(topic, partition, offset, event, rawValue) {
        let lastError = null;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                if (topic === 'user-approval-events') {
                    await this.handleUserApprovalEvent(event);
                } else if (topic === 'reserva-events') {
                    await this.handleReservaEvent(event);
                }
                if (attempt > 1) {
                    logger.info('Procesado exitosamente tras reintento', {
                        topic, partition, kafkaOffset: offset, attempt,
                    });
                }
                return { ok: true, attempts: attempt };
            } catch (err) {
                lastError = err && err.message ? err.message : String(err);
                logger.warn('Error procesando mensaje', {
                    topic, partition, kafkaOffset: offset, attempt, error: lastError,
                });
                if (attempt < MAX_ATTEMPTS) {
                    const delay = BACKOFF_MS[attempt - 1] || BACKOFF_MS[BACKOFF_MS.length - 1];
                    await new Promise((r) => setTimeout(r, delay));
                }
            }
        }
        logger.error('Mensaje agoto reintentos, se envia a DLQ', {
            topic, partition, kafkaOffset: offset, attempts: MAX_ATTEMPTS, error: lastError,
        });
        return { ok: false, attempts: MAX_ATTEMPTS, lastError };
    }

    async _publishToDlq(originalTopic, originalPartition, originalOffset, originalPayload, errorMessage, attempts) {
        const dlqTopic = originalTopic + DLQ_SUFFIX;
        const dlqPayload = {
            originalTopic,
            originalPartition,
            originalOffset,
            originalPayload,
            errorMessage,
            attempts,
            failedAt: new Date().toISOString(),
        };
        try {
            await this.producer.send({
                topic: dlqTopic,
                messages: [{ value: JSON.stringify(dlqPayload) }],
            });
            logger.info('Mensaje publicado en DLQ', {
                dlqTopic, originalTopic, originalPartition, kafkaOffset: originalOffset, attempts,
            });
        } catch (err) {
            logger.error('No se pudo publicar a DLQ', {
                dlqTopic, error: err && err.message,
            });
        }
    }

    async _commit(topic, partition, offset) {
        try {
            await this.consumer.commitOffsets([
                { topic, partition, offset: (BigInt(offset) + 1n).toString() },
            ]);
        } catch (err) {
            logger.warn('No se pudo commitear offset', {
                topic, partition, kafkaOffset: offset, error: err && err.message,
            });
        }
    }

    async handleUserApprovalEvent(event) {
        const { tipo, nombre, telefono, motivo, userId } = event || {};

        if (!telefono) return;

        let messageText = '';

        if (tipo === 'APROBACION') {
            messageText = `*¡Felicidades ${nombre}!* 🎉\n\nTu cuenta como arrendador en *AlquilaYa* ha sido aprobada con éxito. Ya puedes subir tus habitaciones y empezar a recibir solicitudes de estudiantes.\n\n¡Bienvenido a bordo! 🏠✨`;
        } else if (tipo === 'RECHAZO') {
            messageText = `*Hola ${nombre}*,\n\nRevisamos tus documentos en *AlquilaYa* y no pudimos aprobar tu cuenta por el siguiente motivo:\n\n> ${motivo || 'Documentos poco legibles'}\n\nPor favor, ingresa a tu panel y vuelve a subir tus archivos para intentarlo nuevamente. 🙏`;
        }

        if (messageText) {
            await this._sendWhatsApp(telefono, messageText, tipo, { userId, eventType: tipo });
        }
    }

    async handleReservaEvent(event) {
        const {
            tipo, reservaId, propiedadId, montoTotal, motivo,
            estudianteNombre, estudianteTelefono, estudianteId,
            arrendadorTelefono, arrendadorId,
        } = event || {};

        let destino = null;
        let destinoUserId = null;
        let messageText = '';

        switch (tipo) {
            case 'RESERVA_SOLICITADA':
                destino = arrendadorTelefono;
                destinoUserId = arrendadorId;
                messageText = `*AlquilaYa* 🏠\n\n*Nueva solicitud de reserva*\n\n` +
                    `👤 Estudiante: *${estudianteNombre || 'Sin nombre'}*\n` +
                    `🏠 Propiedad ID: ${propiedadId}\n` +
                    `💵 Monto: S/ ${montoTotal || '-'}\n` +
                    `🆔 Reserva #${reservaId}\n\n` +
                    `Ingresa a tu panel para aprobar o rechazar la solicitud.`;
                break;
            case 'RESERVA_APROBADA':
                destino = estudianteTelefono;
                destinoUserId = estudianteId;
                messageText = `*¡Felicidades ${estudianteNombre || ''}!* 🎉\n\n` +
                    `Tu reserva #${reservaId} fue *APROBADA* por el arrendador.\n` +
                    `💵 Monto total: S/ ${montoTotal || '-'}\n\n` +
                    `Ahora puedes proceder al pago desde la app. 💳`;
                break;
            case 'RESERVA_RECHAZADA':
                destino = estudianteTelefono;
                destinoUserId = estudianteId;
                messageText = `*AlquilaYa* 🏠\n\n` +
                    `Lamentamos informarte que tu reserva #${reservaId} fue *rechazada*.\n` +
                    `Motivo: ${motivo || 'No especificado'}\n\n` +
                    `Puedes buscar otras habitaciones disponibles en la app.`;
                break;
            case 'RESERVA_PAGADA':
                destino = arrendadorTelefono;
                destinoUserId = arrendadorId;
                messageText = `*AlquilaYa* 🏠\n\n` +
                    `El estudiante *${estudianteNombre || 'Sin nombre'}* ha *PAGADO* la reserva #${reservaId}.\n` +
                    `💵 Monto: S/ ${montoTotal || '-'}\n\n` +
                    `La reserva queda confirmada. ✅`;
                break;
            case 'RESERVA_CANCELADA':
                const mensaje = `*AlquilaYa* 🏠\n\n` +
                    `La reserva #${reservaId} fue *CANCELADA*.\n` +
                    `Si no fuiste tú quien la canceló, contacta al soporte.`;
                if (estudianteTelefono) {
                    await this._sendWhatsApp(estudianteTelefono, mensaje, tipo, { userId: estudianteId, eventType: tipo });
                }
                if (arrendadorTelefono) {
                    await this._sendWhatsApp(arrendadorTelefono, mensaje, tipo, { userId: arrendadorId, eventType: tipo });
                }
                return;
            default:
                logger.info('Tipo de evento de reserva no manejado', { eventType: tipo });
                return;
        }

        if (destino && messageText) {
            await this._sendWhatsApp(destino, messageText, tipo, { userId: destinoUserId, eventType: tipo });
        } else if (!destino) {
            logger.warn('Evento sin telefono destino, se descarta', { eventType: tipo, reservaId });
        }
    }

    async _sendWhatsApp(telefono, mensaje, ctx, meta = {}) {
        const numeroLimpio = telefono.replace(/\s+/g, '').replace(/^\+/, '');
        const maskedPhone = telefono.replace(/\d(?=\d{4})/g, '*');
        const timeoutMs = 15000;
        const logCtx = { eventType: ctx, phone: maskedPhone, userId: meta.userId };
        try {
            const numberId = await this.client.getNumberId(numeroLimpio);
            if (!numberId) {
                logger.warn('Destinatario sin WhatsApp activo, evento descartado', logCtx);
                await recordAudit(numeroLimpio, {
                    event: ctx, success: false, errorIfAny: 'No WhatsApp account', userId: meta.userId,
                });
                return; // no relanzar
            }
            await Promise.race([
                this.client.sendMessage(numberId._serialized, mensaje),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`sendMessage timeout ${timeoutMs}ms`)), timeoutMs)
                ),
            ]);
            logger.info('WhatsApp enviado', logCtx);
            await recordAudit(numeroLimpio, {
                event: ctx, success: true, userId: meta.userId,
            });
        } catch (error) {
            logger.error('Fallo al enviar WhatsApp', { ...logCtx, error: error && error.message });
            await recordAudit(numeroLimpio, {
                event: ctx, success: false, errorIfAny: error && error.message, userId: meta.userId,
            });
            // Propagamos para reintento del consumer.
            throw error;
        }
    }
}

module.exports = KafkaConsumer;
