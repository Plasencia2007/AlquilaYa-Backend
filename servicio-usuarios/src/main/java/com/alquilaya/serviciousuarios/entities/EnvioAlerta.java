package com.alquilaya.serviciousuarios.entities;

import com.alquilaya.serviciousuarios.enums.EstadoEnvioAlerta;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Fila de la cola de reintentos de las alertas por correo de nuevas propiedades (#99/#492).
 *
 * <p>Replica el patrón <b>Transactional Outbox</b> de {@link OutboxEvent}/
 * {@code OutboxScheduler}, pero aplicado al ENVÍO por suscripción en vez de a Kafka. El
 * consumidor de {@code propiedades-topic} ({@code PropiedadEventListener}) ya no envía los
 * correos síncronamente (best-effort, se perdían en caídas de SMTP): inserta una fila
 * PENDIENTE por cada suscripción que encaja, y {@code EnvioAlertaScheduler} las drena con
 * backoff exponencial y reintentos.</p>
 *
 * <h3>Idempotencia GRATIS</h3>
 * <p>El UNIQUE {@code (propiedad_id, suscripcion_id)} garantiza que un evento Kafka
 * reentregado no duplique el correo: el segundo INSERT choca con la restricción y se
 * absorbe con {@code ON CONFLICT DO NOTHING} (ver {@code EnvioAlertaRepository}).</p>
 *
 * <p>Los datos de la propiedad ({@code titulo}, {@code precio}, ...) y el {@code correo}
 * están <b>desnormalizados</b>: el correo debe poder redactarse aunque la suscripción se dé
 * de baja o la propiedad cambie entre el encolado y el envío.</p>
 */
@Entity
@Table(
        name = "envios_alerta",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_envio_alerta_propiedad_suscripcion",
                columnNames = {"propiedad_id", "suscripcion_id"}),
        indexes = @Index(name = "idx_envio_alerta_drain", columnList = "estado, proximo_intento")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvioAlerta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "propiedad_id", nullable = false)
    private Long propiedadId;

    @Column(name = "suscripcion_id", nullable = false)
    private Long suscripcionId;

    /** Correo destino, desnormalizado para no depender de que la suscripción siga viva al enviar. */
    @Column(nullable = false, length = 255)
    private String correo;

    // --- Datos de la propiedad necesarios para redactar el correo (desnormalizados) ---

    @Column(length = 255)
    private String titulo;

    @Column(precision = 12, scale = 2)
    private BigDecimal precio;

    @Column(length = 255)
    private String ubicacion;

    @Column(name = "tipo_propiedad", length = 100)
    private String tipoPropiedad;

    /** Token de baja de la suscripción, para el enlace "Darme de baja" del correo. */
    @Column(name = "token_baja", length = 64)
    private String tokenBaja;

    // --- Control de la cola de reintentos ---

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoEnvioAlerta estado = EstadoEnvioAlerta.PENDIENTE;

    @Column(nullable = false)
    @Builder.Default
    private Integer intentos = 0;

    /** Momento a partir del cual la fila es elegible para (re)envío. Base del backoff. */
    @Column(name = "proximo_intento", nullable = false)
    private LocalDateTime proximoIntento;

    @Column(name = "ultimo_error", columnDefinition = "TEXT")
    private String ultimoError;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "enviado_at")
    private LocalDateTime enviadoAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null)      createdAt = LocalDateTime.now();
        if (proximoIntento == null) proximoIntento = createdAt;
        if (estado == null)         estado = EstadoEnvioAlerta.PENDIENTE;
        if (intentos == null)       intentos = 0;
    }
}
