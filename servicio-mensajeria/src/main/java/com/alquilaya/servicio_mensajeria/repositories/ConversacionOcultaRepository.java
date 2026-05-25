package com.alquilaya.servicio_mensajeria.repositories;

import com.alquilaya.servicio_mensajeria.entities.ConversacionOculta;
import com.alquilaya.servicio_mensajeria.enums.RolEmisor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversacionOcultaRepository extends JpaRepository<ConversacionOculta, Long> {

    boolean existsByConversacionIdAndPerfilIdAndRol(Long conversacionId, Long perfilId, RolEmisor rol);

    @Query("SELECT o.conversacionId FROM ConversacionOculta o WHERE o.perfilId = :perfilId AND o.rol = :rol")
    List<Long> findConversacionIdsOcultasPara(@Param("perfilId") Long perfilId, @Param("rol") RolEmisor rol);

    @Modifying
    @Query("DELETE FROM ConversacionOculta o WHERE o.conversacionId = :conversacionId AND o.perfilId = :perfilId AND o.rol = :rol")
    int deleteByConversacionIdAndPerfilIdAndRol(@Param("conversacionId") Long conversacionId,
                                                @Param("perfilId") Long perfilId,
                                                @Param("rol") RolEmisor rol);

    @Modifying
    @Query("DELETE FROM ConversacionOculta o WHERE o.conversacionId = :conversacionId AND NOT (o.perfilId = :emisorPerfilId AND o.rol = :emisorRol)")
    int desocultarParaContraparte(@Param("conversacionId") Long conversacionId,
                                  @Param("emisorPerfilId") Long emisorPerfilId,
                                  @Param("emisorRol") RolEmisor emisorRol);
}
