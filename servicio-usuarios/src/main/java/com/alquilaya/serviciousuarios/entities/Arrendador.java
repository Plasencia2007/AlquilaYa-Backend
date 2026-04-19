package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
