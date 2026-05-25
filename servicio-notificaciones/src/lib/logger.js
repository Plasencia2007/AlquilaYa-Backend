// Structured logger basado en Winston.
// - En produccion: JSON line para que se pueda ingestar facilmente.
// - En dev: formato legible con colores.
// Nivel configurable via env LOG_LEVEL (default: info).
const { createLogger, format, transports } = require('winston');

const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const level = (process.env.LOG_LEVEL || 'info').toLowerCase();

const devFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.printf((info) => {
        const { timestamp, level: lvl, message, ...meta } = info;
        const metaKeys = Object.keys(meta).filter((k) => k !== 'service');
        const metaStr = metaKeys.length
            ? ' ' + JSON.stringify(metaKeys.reduce((acc, k) => { acc[k] = meta[k]; return acc; }, {}))
            : '';
        return `${timestamp} [${lvl}] ${message}${metaStr}`;
    })
);

const prodFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
);

const logger = createLogger({
    level,
    defaultMeta: { service: 'servicio-notificaciones' },
    format: isProd ? prodFormat : devFormat,
    transports: [new transports.Console()],
});

module.exports = logger;
