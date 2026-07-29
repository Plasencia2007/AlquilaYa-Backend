package com.alquilaya.serviciopagos.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Item 298: respuesta de la encuesta NPS (0-10) que se muestra en la página de éxito de pago. */
@Entity
@Table(name = "nps_respuestas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NpsRespuesta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reserva_id", nullable = false)
    private Long reservaId;

    @Column(nullable = false)
    private Integer score;

    private String comentario;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
    }
}
