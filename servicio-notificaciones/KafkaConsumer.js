const { Kafka } = require('kafkajs');

/**
 * Kafka Consumer — escucha user-approval-events y reserva-events y los traduce a mensajes WhatsApp.
 */
class KafkaConsumer {
    constructor(whatsappClient) {
        this.client = whatsappClient;
        this.kafka = new Kafka({
            clientId: 'notification-service',
            brokers: ['localhost:9092']
        });

        this.consumer = this.kafka.consumer({ groupId: 'alquilaya-group' });
    }

    async start() {
        console.log('📡 Starting Kafka Consumer in Notification Service...');

        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'user-approval-events', fromBeginning: false });
        await this.consumer.subscribe({ topic: 'reserva-events', fromBeginning: false });

        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const rawValue = message.value.toString();
                console.log(`📥 Received Kafka Event [${topic}]:`, rawValue);

                try {
                    const event = JSON.parse(rawValue);
                    if (topic === 'user-approval-events') {
                        await this.handleUserApprovalEvent(event);
                    } else if (topic === 'reserva-events') {
                        await this.handleReservaEvent(event);
                    }
                } catch (error) {
                    console.error('❌ Error parsing Kafka message:', error);
                }
            },
        });
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
            arrendadorNombre, arrendadorTelefono
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
        let number = telefono.replace('+', '').replace(' ', '');
        if (!number.endsWith('@c.us')) {
            number = `${number}@c.us`;
        }
        try {
            await this.client.sendMessage(number, mensaje);
            console.log(`✅ WhatsApp sent (${ctx}) to ${telefono}`);
        } catch (error) {
            console.error(`❌ Failed to send WhatsApp (${ctx}):`, error.message);
        }
    }
}

module.exports = KafkaConsumer;
