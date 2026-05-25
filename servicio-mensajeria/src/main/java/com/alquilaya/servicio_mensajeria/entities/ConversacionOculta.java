package com.alquilaya.servicio_mensajeria.entities;

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
import com.alquilaya.servicio_mensajeria.enums.RolEmisor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Soft-delete por participante: registra que un usuario (perfil + rol) ocultó
 * una conversación de su lista. La conversación y sus mensajes siguen en BD
 * para auditoría/moderación. Cuando llega un mensaje nuevo del otro participante
 * la fila se borra y la conversación reaparece en la lista del receptor.
 */
@Entity
@Table(
        name = "conversaciones_ocultas",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_conv_oculta_par",
                columnNames = {"conversacion_id", "perfil_id", "rol"}
        ),
        indexes = @Index(name = "idx_conv_oculta_perfil_rol", columnList = "perfil_id, rol")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversacionOculta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversacion_id", nullable = false)
    private Long conversacionId;

    @Column(name = "perfil_id", nullable = false)
    private Long perfilId;

    @Enumerated(EnumType.STRING)
    @Column(name = "rol", nullable = false, length = 20)
    private RolEmisor rol;

    @Column(name = "fecha_oculta", nullable = false)
    private LocalDateTime fechaOculta;

    @PrePersist
    protected void onCreate() {
        if (fechaOculta == null) fechaOculta = LocalDateTime.now();
    }
}
