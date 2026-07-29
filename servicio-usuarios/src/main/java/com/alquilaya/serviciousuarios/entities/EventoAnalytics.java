package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Sink backend de la telemetría de analítica CLIENTE (ítem 455; ver {@code src/lib/analytics.ts}
 * del frontend). Cada fila es UN evento de producto (p.ej. {@code busqueda_ejecutada}) recibido
 * en batch desde el navegador.
 *
 * <p>El endpoint de ingesta es <b>público</b>: visitantes anónimos también generan eventos
 * (p.ej. antes de loguearse), por eso {@code usuarioId} es nullable -- se resuelve del JWT
 * solo si el caller trae uno válido (ver {@code AnalyticsController}).</p>
 *
 * <p>{@code sessionId} es un id anónimo de sesión de navegador (no PII), generado y persistido
 * en {@code sessionStorage} por el frontend -- se renueva por pestaña/sesión de navegación.</p>
 *
 * <p>{@code propiedades} es el payload libre ({@code props}) del evento, serializado a JSON como
 * TEXT: a propósito no está tipado -- cada tipo de evento define sus propias props en el
 * frontend. Tamaño acotado (máx. 4KB) en {@code EventoAnalyticsService} como anti-abuso.</p>
 *
 * <p><b>Sin retención/expurgo automático todavía</b>: cuánto tiempo conservar esta telemetría (y
 * si anonimizar {@code usuarioId} tras cierto tiempo) es una decisión de producto pendiente, no
 * implementada aquí a propósito.</p>
 */
@Entity
@Table(
        name = "eventos_analytics",
        indexes = @Index(name = "idx_evento_analytics_tipo_fecha", columnList = "evento, fecha_creacion")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventoAnalytics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String evento;

    /** Payload libre del evento (`props`), serializado a JSON. Forma libre, no tipada. */
    @Column(columnDefinition = "TEXT")
    private String propiedades;

    /** Id del usuario autenticado que disparó el evento, o null si es un visitante anónimo. */
    @Column(name = "usuario_id")
    private Long usuarioId;

    /** Id de sesión anónima de navegador (sessionStorage del frontend), no PII. Nullable. */
    @Column(name = "session_id", length = 100)
    private String sessionId;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    void onCreate() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
    }
}
