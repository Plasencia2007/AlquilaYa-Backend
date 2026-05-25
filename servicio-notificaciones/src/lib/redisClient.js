// Cliente Redis singleton (ioredis). Se usa para audit trail y metricas.
// No se hace `await` al construir; ioredis maneja la conexion lazy/auto-reconnect.
const Redis = require('ioredis');
const logger = require('./logger');

const host = process.env.REDIS_HOST || 'localhost';
const port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
const password = process.env.REDIS_PASSWORD || undefined;

const redis = new Redis({
    host,
    port,
    password,
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: true,
    retryStrategy(times) {
        // backoff hasta 10s
        return Math.min(1000 * times, 10000);
    },
});

let redisConnected = false;

redis.on('connect', () => {
    redisConnected = true;
    logger.info('Redis connected', { host, port });
});
redis.on('ready', () => {
    redisConnected = true;
});
redis.on('error', (err) => {
    redisConnected = false;
    logger.warn('Redis error', { error: err && err.message });
});
redis.on('end', () => {
    redisConnected = false;
    logger.warn('Redis connection ended');
});
redis.on('reconnecting', () => {
    redisConnected = false;
});

const AUDIT_PREFIX = 'notificaciones:audit:';
const METRICS_LAST_SUCCESS = 'notificaciones:metrics:last-success';
const AUDIT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 dias
const AUDIT_MAX_ITEMS = 100;

/**
 * Registra un evento de notificacion (envio exitoso o fallido) en Redis.
 * Lista circular por telefono, TTL 30 dias.
 */
async function recordAudit(phone, entry) {
    if (!phone) return;
    const key = AUDIT_PREFIX + phone;
    const value = JSON.stringify({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
    });
    try {
        await redis
            .multi()
            .lpush(key, value)
            .ltrim(key, 0, AUDIT_MAX_ITEMS - 1)
            .expire(key, AUDIT_TTL_SECONDS)
            .exec();
        if (entry.success) {
            await redis.set(METRICS_LAST_SUCCESS, value);
        }
    } catch (err) {
        logger.warn('recordAudit failed', { phone, error: err && err.message });
    }
}

async function getAudit(phone, limit = 50) {
    const key = AUDIT_PREFIX + phone;
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, AUDIT_MAX_ITEMS));
    const items = await redis.lrange(key, 0, safeLimit - 1);
    return items.map((raw) => {
        try { return JSON.parse(raw); } catch { return { raw }; }
    });
}

async function getLastSuccess() {
    try {
        const raw = await redis.get(METRICS_LAST_SUCCESS);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return { raw }; }
    } catch {
        return null;
    }
}

async function pingWithTimeout(timeoutMs = 1000) {
    try {
        const result = await Promise.race([
            redis.ping(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('redis ping timeout')), timeoutMs)
            ),
        ]);
        return result === 'PONG';
    } catch {
        return false;
    }
}

function isConnected() {
    return redisConnected && redis.status === 'ready';
}

module.exports = {
    redis,
    recordAudit,
    getAudit,
    getLastSuccess,
    pingWithTimeout,
    isConnected,
};
