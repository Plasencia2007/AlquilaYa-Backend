package com.alquilaya.servicio_mensajeria.dto;

import com.alquilaya.servicio_mensajeria.entities.ModeracionLog;
import com.alquilaya.servicio_mensajeria.enums.AccionModeracion;
import com.alquilaya.servicio_mensajeria.enums.TargetModeracion;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class ModeracionLogDTO {
    Long id;
    Long adminId;
    String adminEmail;
    AccionModeracion accion;
    TargetModeracion targetType;
    Long targetId;
    String motivo;
    LocalDateTime fecha;

    public static ModeracionLogDTO from(ModeracionLog log) {
        return ModeracionLogDTO.builder()
                .id(log.getId())
                .adminId(log.getAdminId())
                .adminEmail(log.getAdminEmail())
                .accion(log.getAccion())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .motivo(log.getMotivo())
                .fecha(log.getFecha())
                .build();
    }
}
