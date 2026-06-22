package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.ConfiguracionAuth;
import com.alquilaya.serviciousuarios.enums.MetodoVerificacion;
import com.alquilaya.serviciousuarios.repositories.ConfiguracionAuthRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fuente de verdad del método de verificación exigido para login (#3). El valor vive
 * en BD (editable desde el panel admin) y se siembra con el default de config-server
 * la primera vez. Aplica en caliente: login y registro lo leen en cada uso.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConfiguracionAuthService {

    /** Fila única de configuración. */
    public static final Long SINGLETON_ID = 1L;

    private final ConfiguracionAuthRepository repository;

    /** Default cuando aún no hay fila (preserva el comportamiento histórico). */
    @Value("${app.auth.metodo-verificacion-default:WHATSAPP_OTP}")
    private String metodoDefault;

    @Transactional
    public MetodoVerificacion getMetodo() {
        return repository.findById(SINGLETON_ID)
                .map(ConfiguracionAuth::getMetodoVerificacion)
                .orElseGet(this::sembrarPorDefecto);
    }

    @Transactional
    public MetodoVerificacion actualizar(MetodoVerificacion metodo) {
        if (metodo == null) {
            throw new IllegalArgumentException("El método de verificación es obligatorio");
        }
        ConfiguracionAuth config = repository.findById(SINGLETON_ID)
                .orElseGet(() -> ConfiguracionAuth.builder().id(SINGLETON_ID).build());
        config.setMetodoVerificacion(metodo);
        repository.save(config);
        log.info("[CONFIG] Método de verificación actualizado a {}", metodo);
        return metodo;
    }

    private MetodoVerificacion sembrarPorDefecto() {
        MetodoVerificacion metodo;
        try {
            metodo = MetodoVerificacion.valueOf(metodoDefault);
        } catch (IllegalArgumentException e) {
            metodo = MetodoVerificacion.WHATSAPP_OTP;
        }
        repository.save(ConfiguracionAuth.builder().id(SINGLETON_ID).metodoVerificacion(metodo).build());
        log.info("[CONFIG] Sembrada configuración de auth con método {}", metodo);
        return metodo;
    }
}
