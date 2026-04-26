package com.plasencia.servicio_mensajeria.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.plasencia.servicio_mensajeria.enums.EstadoMensaje;
import com.plasencia.servicio_mensajeria.enums.RolEmisor;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "mensajes",
        indexes = {
                @Index(name = "idx_msg_conv_fecha", columnList = "conversacion_id, fecha_envio ASC"),
                @Index(name = "idx_msg_conv_estado", columnList = "conversacion_id, estado")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversacion_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    @JsonIgnore
    private Conversacion conversacion;

    @NotNull
    @Column(name = "emisor_perfil_id", nullable = false)
    private Long emisorPerfilId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "emisor_rol", nullable = false, length = 20)
    private RolEmisor emisorRol;

    @NotBlank
    @Size(min = 1, max = 2000, message = "El mensaje debe tener entre 1 y 2000 caracteres")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenido;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoMensaje estado = EstadoMensaje.ENVIADO;

    @Column(name = "fecha_envio", nullable = false, updatable = false)
    private LocalDateTime fechaEnvio;

    @Column(name = "fecha_lectura")
    private LocalDateTime fechaLectura;

    @PrePersist
    protected void onCreate() {
        if (fechaEnvio == null) fechaEnvio = LocalDateTime.now();
        if (estado == null) estado = EstadoMensaje.ENVIADO;
    }
}
