package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.EstadoDenuncia;
import com.alquilaya.serviciopropiedades.enums.MotivoDenuncia;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Denuncia de una publicación hecha por un usuario (estudiante/arrendador). */
@Entity
@Table(name = "denuncias", indexes = {
        @Index(name = "idx_denuncia_propiedad", columnList = "propiedadId"),
        @Index(name = "idx_denuncia_estado", columnList = "estado")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Denuncia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long propiedadId;

    /** perfilId de quien denuncia (null si anónimo/no resuelto). */
    private Long denuncianteId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MotivoDenuncia motivo;

    @Size(max = 1000)
    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoDenuncia estado = EstadoDenuncia.PENDIENTE;

    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        if (estado == null) estado = EstadoDenuncia.PENDIENTE;
    }
}
