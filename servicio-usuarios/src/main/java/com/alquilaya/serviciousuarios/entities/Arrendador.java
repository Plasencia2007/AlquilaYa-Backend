package com.alquilaya.serviciousuarios.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "arrendadores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Arrendador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonIgnore
    private Usuario usuario;

    @Column(name = "nombre_comercial")
    private String nombreComercial;

    private String ruc;
    
    private String telefono;

    @Column(name = "direccion_propiedades")
    private String direccionPropiedades;

    private Double latitud;
    private Double longitud;

    @Column(columnDefinition = "boolean default false")
    private boolean esEmpresa;

    @Builder.Default
    private Double calificacion = 5.0;
}
