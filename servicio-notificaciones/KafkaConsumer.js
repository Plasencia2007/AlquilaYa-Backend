const { Kafka } = require('kafkajs');

/**
 * Kafka Consumer — escucha user-approval-events y reserva-events y los traduce a mensajes WhatsApp.
 */
class KafkaConsumer {
    constructor(whatsappClient) {
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
    }

    async start() {
        console.log('📡 Starting Kafka Consumer in Notification Service...');

        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'user-approval-events', fromBeginning: false });
        await this.consumer.subscribe({ topic: 'reserva-events', fromBeginning: false });

        // autoCommit: false + commit explícito por mensaje = al-menos-una-vez.
        // Los handlers deben tolerar re-entrega (idempotencia) si hay reinicios a mitad de proceso.
        await this.consumer.run({
            autoCommit: false,
            eachMessage: async ({ topic, partition, message }) => {
                const rawValue = message.value ? message.value.toString() : '';
                console.log(`📥 Kafka [${topic}:${partition}@${message.offset}]`);

                let event = null;
                try {
                    event = JSON.parse(rawValue);
                } catch (err) {
                    console.error(`❌ Mensaje mal formado en ${topic}, se descarta. offset=${message.offset}`,
                        err && err.message);
                    // Commit para no quedarse atorado en un payload inválido (no hay DLQ todavía).
                    await this._commit(topic, partition, message.offset);
                    return;
                }

                try {
                    if (topic === 'user-approval-events') {
                        await this.handleUserApprovalEvent(event);
                    } else if (topic === 'reserva-events') {
                        await this.handleReservaEvent(event);
                    }
                    await this._commit(topic, partition, message.offset);
                } catch (err) {
                    // Fallo en el handler: NO commiteamos para que Kafka re-entregue el mensaje.
                    console.error(`❌ Error procesando ${topic} offset=${message.offset}:`, err && err.message);
                    // Pequeño backoff para evitar ciclo de reintento muy agresivo.
                    await new Promise((r) => setTimeout(r, 2000));
                    throw err;
                }
            },
        });
    }

    async _commit(topic, partition, offset) {
        try {
            await this.consumer.commitOffsets([
                { topic, partition, offset: (BigInt(offset) + 1n).toString() },
            ]);
        } catch (err) {
            console.error('⚠️  No se pudo commitear offset:', err && err.message);
        }
    }

    async handleUserApprovalEvent(event) {
        const { tipo, nombre, telefono, motivo } = event;

        if (!telefono) return;

        let messageText = '';

        if (tipo === 'APROBACION') {
            messageText = `*¡Felicidades ${nombre}!* 🎉\n\nTu cuenta como arrendador en *AlquilaYa* ha sido aprobada con éxito. Ya puedes subir tus habitaciones y empezar a recibir solicitudes de estudiantes.\n\n¡Bienvenido a bordo! 🏠✨`;
        } else if (tipo === 'RECHAZO') {
            messageText = `*Hola ${nombre}*,\n\nRevisamos tus documentos en *AlquilaYa* y no pudimos aprobar tu cuenta por el siguiente motivo:\n\n> ${motivo || 'Documentos poco legibles'}\n\nPor favor, ingresa a tu panel y vuelve a subir tus archivos para intentarlo nuevamente. 🙏`;
        }

        if (messageText) {
            await this._sendWhatsApp(telefono, messageText, tipo);
        }
    }

    async handleReservaEvent(event) {
        const {
            tipo, reservaId, propiedadId, montoTotal, motivo,
            estudianteNombre, estudianteTelefono,
            arrendadorTelefono
        } = event;

        let destino = null;
        let messageText = '';

        switch (tipo) {
            case 'RESERVA_SOLICITADA':
                // Notificar al arrendador
                destino = arrendadorTelefono;
                messageText = `*AlquilaYa* 🏠\n\n*Nueva solicitud de reserva*\n\n` +
                    `👤 Estudiante: *${estudianteNombre || 'Sin nombre'}*\n` +
                    `🏠 Propiedad ID: ${propiedadId}\n` +
                    `💵 Monto: S/ ${montoTotal || '-'}\n` +
                    `🆔 Reserva #${reservaId}\n\n` +
                    `Ingresa a tu panel para aprobar o rechazar la solicitud.`;
                break;
            case 'RESERVA_APROBADA':
                destino = estudianteTelefono;
                messageText = `*¡Felicidades ${estudianteNombre || ''}!* 🎉\n\n` +
                    `Tu reserva #${reservaId} fue *APROBADA* por el arrendador.\n` +
                    `💵 Monto total: S/ ${montoTotal || '-'}\n\n` +
                    `Ahora puedes proceder al pago desde la app. 💳`;
                break;
            case 'RESERVA_RECHAZADA':
                destino = estudianteTelefono;
                messageText = `*AlquilaYa* 🏠\n\n` +
                    `Lamentamos informarte que tu reserva #${reservaId} fue *rechazada*.\n` +
                    `Motivo: ${motivo || 'No especificado'}\n\n` +
                    `Puedes buscar otras habitaciones disponibles en la app.`;
                break;
            case 'RESERVA_PAGADA':
                destino = arrendadorTelefono;
                messageText = `*AlquilaYa* 🏠\n\n` +
                    `El estudiante *${estudianteNombre || 'Sin nombre'}* ha *PAGADO* la reserva #${reservaId}.\n` +
                    `💵 Monto: S/ ${montoTotal || '-'}\n\n` +
                    `La reserva queda confirmada. ✅`;
                break;
            case 'RESERVA_CANCELADA':
                // Notificar a ambos
                const mensaje = `*AlquilaYa* 🏠\n\n` +
                    `La reserva #${reservaId} fue *CANCELADA*.\n` +
                    `Si no fuiste tú quien la canceló, contacta al soporte.`;
                if (estudianteTelefono) await this._sendWhatsApp(estudianteTelefono, mensaje, tipo);
                if (arrendadorTelefono) await this._sendWhatsApp(arrendadorTelefono, mensaje, tipo);
                return;
            default:
                console.log(`ℹ️  Tipo de evento de reserva no manejado: ${tipo}`);
                return;
        }

        if (destino && messageText) {
            await this._sendWhatsApp(destino, messageText, tipo);
        } else if (!destino) {
            console.warn(`⚠️  Evento ${tipo} sin teléfono destino — se descarta`);
        }
    }

    async _sendWhatsApp(telefono, mensaje, ctx) {
        const numeroLimpio = telefono.replace(/\s+/g, '').replace(/^\+/, '');
        const maskedPhone = telefono.replace(/\d(?=\d{4})/g, '*');
        const timeoutMs = 15000;
        try {
            // Verifica que el numero tenga WhatsApp activo. Si no, descartamos sin reintentar.
            const numberId = await this.client.getNumberId(numeroLimpio);
            if (!numberId) {
                console.warn(`⚠️  WhatsApp (${ctx}): destinatario ${maskedPhone} sin WhatsApp activo, evento descartado`);
                return; // no relanzar: el commit se hara y no hay forma de recuperar
            }
            await Promise.race([
                this.client.sendMessage(numberId._serialized, mensaje),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`sendMessage timeout ${timeoutMs}ms`)), timeoutMs)
                ),
            ]);
            console.log(`✅ WhatsApp sent (${ctx}) to ${maskedPhone}`);
        } catch (error) {
            console.error(`❌ Failed to send WhatsApp (${ctx}):`, error.message);
            // Propagamos para que el consumer no commitee el offset y reintente.
            throw error;
        }
    }
}

module.exports = KafkaConsumer;
