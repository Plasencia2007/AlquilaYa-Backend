package com.alquilaya.servicio_mensajeria.kafka;

import com.alquilaya.servicio_mensajeria.clients.UsuariosClient;
import com.alquilaya.servicio_mensajeria.enums.TipoNotificacion;
import com.alquilaya.servicio_mensajeria.services.NotificacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Notif admin (gap #2/3 del panel de notificaciones): helper compartido para eventos que no
 * notifican al usuario dueño del recurso, sino a TODOS los admins ACTIVOS.
 *
 * <p>Extraído de {@code UserApprovalEventConsumer#notificarAdmins} (ítem 378, caso
 * {@code DOCUMENTO_SUBIDO}, el primer consumer que implementó este patrón) para que
 * {@code PropiedadEventConsumer} (casos {@code DENUNCIA_CREADA} y {@code PROPIEDAD_PENDIENTE})
 * lo reuse tal cual en vez de duplicar la resolución de admins vía Feign.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminNotificador {

    private final UsuariosClient usuariosClient;
    private final NotificacionService notificacionService;

    /**
     * Resuelve los admins activos vía Feign S2S ({@code GET /api/v1/usuarios/admin/ids-activos})
     * y crea una notificación idéntica para cada uno. Best-effort: si Feign falla o no hay
     * admins activos, solo loguea y no propaga excepción (no debe tumbar el consumer).
     *
     * @param origenLog   etiqueta para los logs (p.ej. {@code "DOCUMENTO_SUBIDO"}, {@code "DENUNCIA_CREADA"})
     * @param tipo        tipo de notificación in-app
     * @param titulo      título de la notificación
     * @param mensaje     mensaje ya construido (specifico del evento)
     * @param urlDestino  a dónde navega el admin al hacer click
     * @param datos       payload adicional persistido junto a la notificación
     */
    public void notificarAdmins(String origenLog, TipoNotificacion tipo, String titulo, String mensaje,
                                 String urlDestino, Map<String, Object> datos) {
        List<Long> admins;
        try {
            admins = usuariosClient.obtenerAdminsActivos();
        } catch (Exception e) {
            log.warn("[NOTIF] No se pudo resolver admins activos para {}: {}", origenLog, e.getMessage());
            return;
        }
        if (admins == null || admins.isEmpty()) {
            log.debug("[NOTIF] {}: no hay admins activos a notificar", origenLog);
            return;
        }

        for (Long adminId : admins) {
            notificacionService.crear(adminId, tipo, titulo, mensaje, urlDestino, datos, true);
        }
    }
}
