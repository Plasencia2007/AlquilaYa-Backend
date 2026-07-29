package com.alquilaya.serviciousuarios.entities;

import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.enums.TipoLogin;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;
    
    @Column(nullable = false)
    private String apellido;

    @Column(nullable = false, length = 8)
    private String dni;

    @Column(nullable = false, unique = true)
    private String correo;

    @Column(nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore // Nunca serializar el hash en respuestas JSON (admin/perfil).
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rol rol;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EstadoUsuario estado = EstadoUsuario.PENDING;

    @Column(length = 20)
    private String telefono;

    @Column(nullable = false)
    @Builder.Default
    private boolean telefonoVerificado = false;

    /** Correo confirmado (link de verificación, o Google que ya lo verifica). #3 */
    @Column(nullable = false)
    @org.hibernate.annotations.ColumnDefault("false")
    @Builder.Default
    private boolean emailVerificado = false;

    @Column(name = "foto_url", length = 512)
    private String fotoUrl;

    @Column(name = "fecha_nacimiento")
    private java.time.LocalDate fechaNacimiento;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_login", nullable = false, columnDefinition = "varchar(20) default 'LOCAL'")
    @Builder.Default
    private TipoLogin tipoLogin = TipoLogin.LOCAL;

    // No serializar en respuestas JSON de /usuarios (listarTodos/obtenerPorId/actualizarUsuario):
    // son URLs de documentos KYC, y el frontend ya los consulta por el endpoint dedicado
    // GET /usuarios/documentos/usuario/{usuarioId} (verificado: ningún consumidor del frontend
    // lee este campo anidado). Migrar todo el endpoint a DTOs específicos por caso de uso queda
    // pendiente como mejora aparte (afecta también arrendador/estudiante, que sí se consumen).
    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private java.util.List<DocumentoVerificacion> documentos;

    @OneToOne(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    private Arrendador arrendador;

    @OneToOne(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    private Estudiante estudiante;

    /** Roles personalizados (RBAC dinámico #32) asignados a este usuario. Suman permisos al rol base. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "usuario_roles_personalizados",
            joinColumns = @JoinColumn(name = "usuario_id"),
            inverseJoinColumns = @JoinColumn(name = "rol_personalizado_id"))
    @ToString.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Builder.Default
    private java.util.Set<RolPersonalizado> rolesPersonalizados = new java.util.HashSet<>();

    /** Baja de cuenta (GDPR, G8-B): true cuando la cuenta fue anonimizada/dada de baja.
     *  Filtra la cuenta de los listados y bloquea su login (verificarCuentaHabilitada). */
    @Column(nullable = false)
    @org.hibernate.annotations.ColumnDefault("false")
    @Builder.Default
    private boolean eliminado = false;

    /** Momento en que la cuenta fue anonimizada/dada de baja (null si activa). */
    @Column(name = "fecha_eliminacion")
    private LocalDateTime fechaEliminacion;

    /** Motivo del baneo (solo se persiste cuando {@code estado} pasa a BANNED). Nullable:
     *  no todo cambio de estado lo requiere, y los baneos previos a esta columna no lo tienen. */
    @Column(name = "motivo_baneo", length = 500)
    private String motivoBaneo;

    /** Momento (reloj del servidor) en que el usuario aceptó los Términos y condiciones y la
     *  Política de privacidad al registrarse (ítem 185, cobertura legal). Null en cuentas
     *  creadas antes de esta columna o por vías que no pasan por el checkbox (p. ej. /register-admin). */
    @Column(name = "acepta_terminos_en")
    private LocalDateTime aceptaTerminosEn;

    // ===== Preferencias de notificacion (item 210) =====
    // Categorias reales del catalogo TipoNotificacion de servicio-mensajeria: MENSAJE_NUEVO,
    // {RESERVA_*, RECORDATORIO_PAGO} y ALERTA_ZONA (la unica categoria "opt-in"/promocional que
    // existe hoy: suscripcion a alertas de nuevas propiedades). DOCUMENTO_*/BIENVENIDA/SISTEMA
    // son notificaciones de cuenta y no son togglable -- siempre se entregan.

    @Column(name = "notificar_mensajes", nullable = false)
    @org.hibernate.annotations.ColumnDefault("true")
    @Builder.Default
    private boolean notificarMensajes = true;

    @Column(name = "notificar_reservas", nullable = false)
    @org.hibernate.annotations.ColumnDefault("true")
    @Builder.Default
    private boolean notificarReservas = true;

    @Column(name = "notificar_marketing", nullable = false)
    @org.hibernate.annotations.ColumnDefault("false")
    @Builder.Default
    private boolean notificarMarketing = false;

    // ===== 2FA / TOTP (item 229) =====

    /** Secret TOTP (base32) ya confirmado. Nunca se serializa en JSON. Null si 2FA no esta activo. */
    @Column(name = "totp_secret")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String totpSecret;

    @Column(name = "totp_habilitado", nullable = false)
    @org.hibernate.annotations.ColumnDefault("false")
    @Builder.Default
    private boolean totpHabilitado = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime fechaCreacion;

    @UpdateTimestamp
    private LocalDateTime fechaActualizacion;

    @Transient
    private Long perfilId;
}
