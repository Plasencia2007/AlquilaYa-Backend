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

    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
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

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime fechaCreacion;

    @UpdateTimestamp
    private LocalDateTime fechaActualizacion;

    @Transient
    private Long perfilId;
}
