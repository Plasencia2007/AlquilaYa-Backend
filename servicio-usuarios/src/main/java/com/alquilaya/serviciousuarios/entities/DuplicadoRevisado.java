package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Marca un cluster de cuentas duplicadas (#8, ítem 385) como "revisado — no es duplicado",
 * para excluirlo de {@link com.alquilaya.serviciousuarios.services.DeteccionDuplicadosService}.
 *
 * <p>El cluster no tiene id estable en {@code Usuario} (se recalcula en cada detección), así
 * que se identifica por el mismo par {@code (criterio, valor)} que arma el cluster —
 * DNI/TELEFONO/EMAIL + el valor compartido. NO implica fusión de cuentas (fase 2, fuera de
 * alcance): solo silencia el falso positivo para el admin.</p>
 */
@Entity
@Table(
        name = "duplicado_revisado",
        uniqueConstraints = @UniqueConstraint(name = "uk_duplicado_revisado_criterio_valor", columnNames = {"criterio", "valor"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DuplicadoRevisado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** DNI | TELEFONO | EMAIL — mismo valor que {@code ClusterDuplicadoDTO#criterio}. */
    @Column(nullable = false, length = 20)
    private String criterio;

    /** Valor compartido por el cluster (DNI, teléfono o email canónico). */
    @Column(nullable = false, length = 255)
    private String valor;

    /** Id del admin que marcó el cluster como revisado (null si no se pudo resolver). */
    @Column(name = "revisado_por")
    private Long revisadoPor;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime fecha;
}
