package com.alquilaya.serviciousuarios.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "estudiantes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Estudiante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonIgnore
    private Usuario usuario;

    private String universidad;

    /** FK lógica (sin constraint real: BD distinta, MySQL en servicio-catalogos) hacia
     *  el catálogo de universidades — ítem 226, Fase 2 de la migración multi-universidad. */
    @Column(name = "universidad_id")
    private Long universidadId;

    @Column(name = "codigo_estudiante")
    private String codigoEstudiante;

    private String carrera;

    @Min(1) @Max(12)
    private Integer ciclo;

    @Builder.Default
    private boolean verificado = false;

    /** Reservas finalizadas con éxito (señal de actividad "buen inquilino", score #26 Fase 2). */
    @Builder.Default
    @Column(name = "reservas_completadas")
    private Integer reservasCompletadas = 0;

    /** Reservas canceladas/expiradas (señal negativa, score #26 Fase 2). */
    @Builder.Default
    @Column(name = "reservas_fallidas")
    private Integer reservasFallidas = 0;

    // ===== Perfil de convivencia (#38 Fase 0) — confianza + compatibilidad de roommates =====
    // Los campos de hábitos/preferencias guardan valores de un vocabulario fijo que define el
    // frontend (p. ej. fuma = NO|SI|SOLO_AFUERA); se comparan tal cual en el matching (Fase 1).

    @Column(length = 600)
    private String bio;
    private String instagram;

    // --- Hábitos ---
    private String fuma;          // NO | SI | SOLO_AFUERA
    private String horario;       // MADRUGADOR | NOCTURNO | FLEXIBLE
    private String orden;         // MUY_ORDENADO | NORMAL | RELAJADO
    private String ruido;         // SILENCIO | INDIFERENTE
    private String sociabilidad;  // TRANQUILO | SOCIABLE | FIESTERO
    private String mascotas;      // TENGO | ACEPTO | NO
    private String invitados;     // SEGUIDO | AVECES | CASI_NUNCA

    // --- Preferencias de roommate ---
    private String genero;        // MASCULINO | FEMENINO | OTRO
    @Column(name = "comparte_con")
    private String comparteCon;   // MIXTO | MISMO_GENERO
    @Column(name = "presupuesto_min")
    private Integer presupuestoMin;
    @Column(name = "presupuesto_max")
    private Integer presupuestoMax;
    @Column(name = "fecha_mudanza")
    private java.time.LocalDate fechaMudanza;
    @Column(name = "num_companeros")
    private Integer numCompaneros;

    /** Si está activo, el estudiante aparece en el board de búsqueda de roommates (#38). */
    @Builder.Default
    @Column(name = "busca_companeros", columnDefinition = "boolean default false")
    private Boolean buscaCompaneros = false;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "estudiante_intereses", joinColumns = @JoinColumn(name = "estudiante_id"))
    @Column(name = "interes")
    @Builder.Default
    private java.util.Set<String> intereses = new java.util.HashSet<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "estudiante_zonas_pref", joinColumns = @JoinColumn(name = "estudiante_id"))
    @Column(name = "zona")
    @Builder.Default
    private java.util.Set<String> zonasPreferidas = new java.util.HashSet<>();
}
