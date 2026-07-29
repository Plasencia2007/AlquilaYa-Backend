package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.EnvioAlerta;
import com.alquilaya.serviciousuarios.enums.EstadoEnvioAlerta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Cola de reintentos de las alertas por correo ({@code envios_alerta}). Réplica del acceso
 * de {@code OutboxRepository}: lectura con {@code FOR UPDATE SKIP LOCKED} para soportar varias
 * réplicas drenando en paralelo sin pisarse.
 */
@Repository
public interface EnvioAlertaRepository extends JpaRepository<EnvioAlerta, Long> {

    /**
     * Encola una alerta PENDIENTE absorbiendo el duplicado. El UNIQUE
     * {@code (propiedad_id, suscripcion_id)} + {@code ON CONFLICT DO NOTHING} da idempotencia
     * GRATIS: si un evento Kafka reentregado intenta reinsertar el mismo par, la BD lo ignora
     * (0 filas) y el correo no se duplica. Inserta por SQL nativo (no vía persist) para que el
     * conflicto no lance excepción ni ensucie la transacción del listener.
     *
     * @return 1 si se insertó, 0 si ya existía (duplicado absorbido).
     */
    @Modifying
    @Query(value = """
            INSERT INTO envios_alerta
                (propiedad_id, suscripcion_id, correo, titulo, precio, ubicacion,
                 tipo_propiedad, token_baja, estado, intentos, proximo_intento, created_at)
            VALUES
                (:propiedadId, :suscripcionId, :correo, :titulo, :precio, :ubicacion,
                 :tipoPropiedad, :tokenBaja, 'PENDIENTE', 0, :ahora, :ahora)
            ON CONFLICT (propiedad_id, suscripcion_id) DO NOTHING
            """, nativeQuery = true)
    int encolarPendiente(@Param("propiedadId") Long propiedadId,
                         @Param("suscripcionId") Long suscripcionId,
                         @Param("correo") String correo,
                         @Param("titulo") String titulo,
                         @Param("precio") BigDecimal precio,
                         @Param("ubicacion") String ubicacion,
                         @Param("tipoPropiedad") String tipoPropiedad,
                         @Param("tokenBaja") String tokenBaja,
                         @Param("ahora") LocalDateTime ahora);

    /**
     * Lee un batch de alertas listas para (re)enviar: {@code estado = 'PENDIENTE'} y
     * {@code proximo_intento <= now}. Lock pesimista {@code FOR UPDATE SKIP LOCKED} para que
     * varias instancias del servicio no envíen el mismo correo dos veces.
     */
    @Query(value = """
            SELECT * FROM envios_alerta
            WHERE estado = 'PENDIENTE' AND proximo_intento <= :ahora
            ORDER BY proximo_intento ASC
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<EnvioAlerta> findPendientesParaEnviar(@Param("ahora") LocalDateTime ahora,
                                               @Param("limit") int limit);

    /**
     * Lista paginada de alertas por estado. Usada por el panel admin para inspeccionar la DLQ
     * lógica ({@link EstadoEnvioAlerta#FALLIDO}: filas que agotaron los reintentos).
     */
    Page<EnvioAlerta> findByEstado(EstadoEnvioAlerta estado, Pageable pageable);
}
