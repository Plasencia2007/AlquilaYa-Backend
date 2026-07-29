package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Publicación de borradores: valida un borrador y lo transiciona a PENDIENTE (revisión admin).
 * Centraliza la lógica usada tanto por la publicación manual como por la programada (scheduler).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PublicacionService {

    private static final Set<String> TIPOS_MULTIAMBIENTE =
            Set.of("DEPARTAMENTO", "MINI_DEPA", "CASA");

    private final PropiedadRepository propiedadRepository;
    private final Validator validator;
    private final ZonaResolver zonaResolver;
    private final PropiedadService propiedadService;
    private final KafkaProducerService kafkaProducerService;

    /**
     * Valida que un borrador sea publicable (campos obligatorios + distribución por tipo +
     * ubicación dentro de una zona) y le asigna zona/distancia. Lanza si no es publicable.
     */
    public void validarPublicable(Propiedad p) {
        Set<ConstraintViolation<Propiedad>> violations = validator.validate(p);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
        validarDistribucionPorTipo(p);
        propiedadService.calcularYSetearDistancia(p);

        ZonaResolver.Resultado r = zonaResolver.resolver(p.getLatitud(), p.getLongitud());
        if (r.estado() == ZonaResolver.Estado.FUERA_DE_ZONA) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La ubicación está fuera de toda zona de cobertura. Acércala a una universidad registrada.");
        }
        if (r.estado() == ZonaResolver.Estado.ASIGNADA) {
            p.setZonaId(r.zonaId());
            p.setUniversidadId(r.universidadId());
        } else {
            p.setZonaId(null);
            p.setUniversidadId(null);
        }
    }

    /** Publica un borrador: valida y pasa BORRADOR→PENDIENTE, limpiando la programación. */
    @Transactional
    public Propiedad publicarBorrador(Long id) {
        Propiedad p = propiedadRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Borrador no encontrado"));
        if (p.getEstado() != EstadoPropiedad.BORRADOR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La propiedad ya fue publicada");
        }
        validarPublicable(p);
        p.setEstado(EstadoPropiedad.PENDIENTE);
        p.setFechaPublicacionProgramada(null);
        Propiedad guardada = propiedadRepository.save(p);
        // Notif admin (gap #2/3): alerta a todos los admins activos que hay una propiedad
        // nueva pendiente de revisión.
        kafkaProducerService.enviarPropiedadPendiente(guardada.getId(), guardada.getTitulo(), guardada.getArrendadorId());
        return guardada;
    }

    private void validarDistribucionPorTipo(Propiedad p) {
        String tipo = p.getTipoPropiedad() == null ? "" : p.getTipoPropiedad().trim().toUpperCase();
        if (!TIPOS_MULTIAMBIENTE.contains(tipo)) {
            return;
        }
        List<String> faltan = new ArrayList<>();
        if (p.getNumDormitorios() == null || p.getNumDormitorios() < 1) faltan.add("número de dormitorios");
        if (p.getNumBanos() == null || p.getNumBanos() < 1) faltan.add("número de baños");
        if (p.getCapacidadPersonas() == null || p.getCapacidadPersonas() < 1) faltan.add("capacidad de personas");
        if (!faltan.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Para un inmueble completo debes indicar: " + String.join(", ", faltan) + ".");
        }
    }
}
