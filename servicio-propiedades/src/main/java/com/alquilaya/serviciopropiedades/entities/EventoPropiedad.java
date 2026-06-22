package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.TipoEvento;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Evento de interacción (VISTA/CONTACTO) sobre una publicación — base de la analítica. */
@Entity
@Table(name = "eventos_propiedad", indexes = {
        @Index(name = "idx_evento_prop_tipo_fecha", columnList = "propiedadId, tipo, fechaCreacion")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventoPropiedad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long propiedadId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoEvento tipo;

    /** perfilId del actor (null si anónimo). */
    private Long perfilId;

    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
    }
}
