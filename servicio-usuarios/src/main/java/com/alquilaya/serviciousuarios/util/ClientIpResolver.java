package com.alquilaya.serviciousuarios.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Resuelve la IP real del cliente respetando {@code rate-limit.trusted-hops} (S8).
 *
 * <p>Componente único compartido entre {@code RateLimitFilter} (throttling por IP) y
 * {@code AuthController} (IP registrada en {@code LoginAttempt} y en las alertas de
 * intentos fallidos). Antes cada uno traía su propia lógica: el filtro validaba los
 * proxies de confianza, pero el controller tomaba a ciegas la primera entrada de
 * {@code X-Forwarded-For}, un header que el propio cliente puede falsificar. Eso
 * contaminaba la IP guardada en auditoría con valores no confiables. Con un único
 * resolver, ambos quedan consistentes y sólo hay un lugar que mantener.</p>
 */
@Component
public class ClientIpResolver {

    /**
     * Nº de proxies de confianza delante de este servicio que anexan a X-Forwarded-For (S8).
     * Default 0 → usa la IP del socket (no falsificable). En prod usuarios sólo es accesible
     * vía el gateway (red interna), así que el vector de spoofing externo real es el gateway.
     */
    @Value("${rate-limit.trusted-hops:0}")
    private int trustedProxyHops;

    // S8: resistente a X-Forwarded-For falsificado. Cuenta desde la DERECHA saltando los
    // proxies de confianza; las entradas falsas del atacante quedan a la izquierda y nunca se
    // eligen. Cadena corta (dev / spoof directo) → cae a getRemoteAddr() (IP del socket).
    public String resolve(HttpServletRequest request) {
        if (request == null) return null;
        if (trustedProxyHops > 0) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                String[] parts = xff.split(",");
                int idx = parts.length - 1 - trustedProxyHops;
                if (idx >= 0) {
                    String ip = parts[idx].trim();
                    if (!ip.isBlank()) {
                        return ip;
                    }
                }
            }
        }
        return request.getRemoteAddr();
    }
}
