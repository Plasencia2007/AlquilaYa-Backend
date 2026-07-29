package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Suscripción anónima a alertas por correo de nuevas propiedades (MEJORAS.md #99/#492).
 *
 * <p>El suscriptor es un <b>visitante del home sin cuenta</b>: no se ata a ningún
 * {@code usuarioId}. Guarda los filtros de interés (zona y/o universidad, tope de precio
 * opcional) y, cuando servicio-propiedades aprueba una propiedad que encaja, se le envía
 * un correo (ver {@code PropiedadEventListener} + {@code EmailService}).</p>
 *
 * <p><b>Double opt-in:</b> al crearse queda {@code confirmada = false}; solo recibe alertas
 * tras confirmar el enlace enviado a su correo. Esto evita que un tercero suscriba el correo
 * de una víctima a spam recurrente.</p>
 *
 * <p>Dos tokens aleatorios e impredecibles ({@code SecureRandom}, ver
 * {@code SuscripcionAlertaService}): uno para confirmar el alta (double opt-in) y otro para
 * darse de baja. Nunca se exponen ids secuenciales en enlaces públicos.</p>
 */
@Entity
@Table(
        name = "suscripciones_alerta",
        indexes = {
                @Index(name = "idx_suscripcion_alerta_correo", columnList = "correo"),
                @Index(name = "idx_suscripcion_alerta_match", columnList = "activo, confirmada")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SuscripcionAlerta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String correo;

    /** Zona de cobertura del catálogo que interesa al suscriptor. Nullable si solo filtra por universidad. */
    @Column(name = "zona_id")
    private Long zonaId;

    /** Universidad que interesa al suscriptor. Nullable si solo filtra por zona. */
    @Column(name = "universidad_id")
    private Long universidadId;

    /** Tope de precio opcional: solo notificar propiedades con precio &lt;= este valor. */
    @Column(name = "precio_max", precision = 12, scale = 2)
    private BigDecimal precioMax;

    /**
     * Tipo de propiedad de interés (nombre del enum {@code TipoPropiedad} de servicio-propiedades,
     * p.ej. {@code CUARTO_INDIVIDUAL}). Nullable = no filtra por tipo.
     */
    @Column(name = "tipo_propiedad", length = 100)
    private String tipoPropiedad;

    /** Dormitorios mínimos que debe tener la propiedad. Nullable = no filtra por dormitorios. */
    @Column(name = "dormitorios_min")
    private Integer dormitoriosMin;

    /** Capacidad (personas) mínima que debe tener la propiedad. Nullable = no filtra por capacidad. */
    @Column(name = "capacidad_min")
    private Integer capacidadMin;

    /**
     * Servicios que la propiedad debe ofrecer TODOS (subset ⊆). Vacío = no filtra por servicios.
     * Se guardan como códigos/nombres de servicio, alineados con los que viajan en el evento
     * {@code PROPIEDAD_APROBADA}. Se carga con {@code LEFT JOIN FETCH} en el matching para evitar
     * N+1 (ver {@code SuscripcionAlertaRepository#findCoincidencias}); por eso {@code FetchType.LAZY}.
     */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "suscripcion_alerta_servicios",
            joinColumns = @JoinColumn(name = "suscripcion_id"))
    @Column(name = "servicio")
    @Builder.Default
    private Set<String> servicios = new HashSet<>();

    /** true una vez el suscriptor confirmó el alta por correo (double opt-in). */
    @Builder.Default
    @Column(nullable = false)
    private boolean confirmada = false;

    /** false tras darse de baja. Solo las {@code activo && confirmada} reciben alertas. */
    @Builder.Default
    @Column(nullable = false)
    private boolean activo = true;

    /** Token impredecible para confirmar el alta (double opt-in). */
    @Column(name = "token_confirmacion", nullable = false, unique = true, length = 64)
    private String tokenConfirmacion;

    /** Token impredecible para darse de baja. */
    @Column(name = "token_baja", nullable = false, unique = true, length = 64)
    private String tokenBaja;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_confirmacion")
    private LocalDateTime fechaConfirmacion;

    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
    }
}
