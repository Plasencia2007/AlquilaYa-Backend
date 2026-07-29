package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
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
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Historial de auditoría (ítem 366) de decisiones de moderación (aprobar/rechazar) sobre
 * propiedades. Append-only: se escribe una fila cada vez que un admin aprueba o rechaza un
 * inmueble desde {@code AdminPropiedadController}. {@code propiedadTitulo} va denormalizado
 * (mismo patrón que {@link Denuncia} → DenunciaDTO) para que el historial siga siendo legible
 * aunque la propiedad se borre después.
 */
@Entity
@Table(name = "decisiones_moderacion_propiedad", indexes = {
        @Index(name = "idx_decision_moderacion_propiedad", columnList = "propiedadId"),
        @Index(name = "idx_decision_moderacion_fecha", columnList = "fecha")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DecisionModeracionPropiedad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long propiedadId;

    @Column(nullable = false, length = 255)
    private String propiedadTitulo;

    /** userId del admin que decidió. Nullable: nunca debe bloquear la decisión real si falta. */
    @Column(name = "admin_id")
    private Long adminId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoPropiedad decision;

    @Size(max = 500)
    @Column(length = 500)
    private String motivo;

    private LocalDateTime fecha;

    @PrePersist
    protected void onCreate() {
        if (fecha == null) fecha = LocalDateTime.now();
    }
}
