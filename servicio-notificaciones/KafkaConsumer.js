const { Kafka } = require('kafkajs');

/**
 * Kafka Consumer for User Approval Events
 * Bridges Java backend events to WhatsApp messages
 */
class KafkaConsumer {
    constructor(whatsappClient) {
        this.client = whatsappClient;
        this.kafka = new Kafka({
            clientId: 'notification-service',
            brokers: ['localhost:9092'] // Shared with Docker config
        });
        
        this.consumer = this.kafka.consumer({ groupId: 'alquilaya-group' });
    }

    async start() {
        console.log('📡 Starting Kafka Consumer in Notification Service...');
        
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'user-approval-events', fromBeginning: false });

        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const rawValue = message.value.toString();
                console.log(`📥 Received Kafka Event [${topic}]:`, rawValue);

                try {
                    const event = JSON.parse(rawValue);
                    await this.handleEvent(event);
                } catch (error) {
                    console.error('❌ Error parsing Kafka message:', error);
                }
            },
        });
    }

    async handleEvent(event) {
        const { tipo, nombre, telefono, motivo } = event;

        if (!telefono) return;

        // Format phone number
        let number = telefono.replace('+', '').replace(' ', '');
        if (!number.endsWith('@c.us')) {
            number = `${number}@c.us`;
        }

        let messageText = '';

        if (tipo === 'APROBACION') {
            messageText = `*¡Felicidades ${nombre}!* 🎉\n\nTu cuenta como arrendador en *AlquilaYa* ha sido aprobada con éxito. Ya puedes subir tus habitaciones y empezar a recibir solicitudes de estudiantes.\n\n¡Bienvenido a bordo! 🏠✨`;
        } else if (tipo === 'RECHAZO') {
            messageText = `*Hola ${nombre}*,\n\nRevisamos tus documentos en *AlquilaYa* y no pudimos aprobar tu cuenta por el siguiente motivo:\n\n> ${motivo || 'Documentos poco legibles'}\n\nPor favor, ingresa a tu panel y vuelve a subir tus archivos para intentarlo nuevamente. 🙏`;
        }

        if (messageText) {
            try {
                await this.client.sendMessage(number, messageText);
                console.log(`✅ WhatsApp sent via Kafka event to ${telefono}`);
            } catch (error) {
                console.error(`❌ Failed to send WhatsApp for Kafka event:`, error);
            }
        }
    }
}

module.exports = KafkaConsumer;
