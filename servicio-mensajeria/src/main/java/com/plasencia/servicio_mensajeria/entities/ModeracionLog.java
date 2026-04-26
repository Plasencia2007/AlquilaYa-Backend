package com.plasencia.servicio_mensajeria.entities;

import com.plasencia.servicio_mensajeria.enums.AccionModeracion;
import com.plasencia.servicio_mensajeria.enums.TargetModeracion;
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

@Entity
@Table(
        name = "moderacion_log",
        indexes = @Index(name = "idx_mod_target", columnList = "target_type, target_id, fecha DESC")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModeracionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @NotNull
    @Size(max = 150)
    @Column(name = "admin_email", nullable = false, length = 150)
    private String adminEmail;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private AccionModeracion accion;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private TargetModeracion targetType;

    @NotNull
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Size(max = 500)
    @Column(length = 500)
    private String motivo;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fecha;

    @PrePersist
    protected void onCreate() {
        if (fecha == null) fecha = LocalDateTime.now();
    }
}
