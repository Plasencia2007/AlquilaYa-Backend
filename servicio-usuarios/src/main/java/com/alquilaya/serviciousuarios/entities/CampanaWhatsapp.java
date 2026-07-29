package com.alquilaya.serviciousuarios.entities;

import com.alquilaya.serviciousuarios.enums.EstadoEnvioCampana;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Campaña de mensajes WhatsApp para un segmento de estudiantes (ítem 381).
 *
 * <p>El envío real ocurre en {@code servicio-notificaciones} vía Kafka (topic
 * {@code campanas-whatsapp-events}): esta fila solo guarda la definición de la campaña
 * (segmento + mensaje + programación) y su estado de encolado. La entrega punto a punto la
 * cubre el {@code OutboxScheduler} existente (mismo mecanismo que el resto de eventos del
 * servicio), así que aquí NO se replica esa lógica de reintentos — solo se resuelve la lista de
 * destinatarios y se encola un evento por cada uno.</p>
 */
@Entity
@Table(
        name = "campanas_whatsapp",
        indexes = @Index(name = "idx_campana_whatsapp_pendiente", columnList = "estado_envio, programado_para")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampanaWhatsapp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Filtro de segmento: carrera exacta (ver {@code Estudiante.carrera}), null = todas. */
    @Column(length = 150)
    private String carrera;

    /** Filtro de segmento: estado de cuenta, null = cualquiera (siempre excluye no-activables). */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private EstadoUsuario estado;

    @NotBlank
    @Size(min = 1, max = 1000)
    @Column(nullable = false, length = 1000)
    private String mensaje;

    /** Null = envío inmediato al crear. */
    @Column(name = "programado_para")
    private LocalDateTime programadoPara;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_envio", nullable = false, length = 20)
    @Builder.Default
    private EstadoEnvioCampana estadoEnvio = EstadoEnvioCampana.PENDIENTE;

    /** Cantidad de destinatarios efectivamente encolados (snapshot al momento del envío). */
    private Integer destinatarios;

    @Column(name = "ultimo_error", columnDefinition = "TEXT")
    private String ultimoError;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "enviado_at")
    private LocalDateTime enviadoAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (estadoEnvio == null) estadoEnvio = EstadoEnvioCampana.PENDIENTE;
    }
}
