package com.alquilaya.servicio_catalogos.config;

import com.alquilaya.servicio_catalogos.entities.Carrera;
import com.alquilaya.servicio_catalogos.entities.ItemCatalogo;
import com.alquilaya.servicio_catalogos.entities.Universidad;
import com.alquilaya.servicio_catalogos.entities.ZonaCobertura;
import com.alquilaya.servicio_catalogos.enums.TipoItem;
import com.alquilaya.servicio_catalogos.enums.TipoLimite;
import com.alquilaya.servicio_catalogos.repositories.CarreraRepository;
import com.alquilaya.servicio_catalogos.repositories.ItemCatalogoRepository;
import com.alquilaya.servicio_catalogos.repositories.UniversidadRepository;
import com.alquilaya.servicio_catalogos.repositories.ZonaCoberturaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final ItemCatalogoRepository repository;
    private final UniversidadRepository universidadRepository;
    private final ZonaCoberturaRepository zonaCoberturaRepository;
    private final CarreraRepository carreraRepository;

    @Override
    public void run(String... args) {
        seedUniversidades();
        seedCarreras();
        seedCatalogos();
    }

    private void seedCatalogos() {
        if (repository.count() == 0) {
            log.info("Iniciando precarga de datos en el catálogo...");

            // SERVICIOS
            repository.saveAll(List.of(
                createItem("WiFi de Alta Velocidad", "WIFI", TipoItem.SERVICIO, "fa-wifi"),
                createItem("Agua Caliente 24h", "AGUA_CALIENTE", TipoItem.SERVICIO, "fa-tint"),
                createItem("Luz Incluida", "LUZ", TipoItem.SERVICIO, "fa-lightbulb"),
                createItem("Lavandería Compartida", "LAVANDERIA", TipoItem.SERVICIO, "fa-tshirt"),
                createItem("Cocina Equipada", "COCINA", TipoItem.SERVICIO, "fa-utensils"),
                createItem("Entrada Independiente", "ENTRADA_IND", TipoItem.SERVICIO, "fa-key")
            ));

            // TIPOS DE CUARTO
            repository.saveAll(List.of(
                createItem("Cuarto individual", "CUARTO_INDIVIDUAL", TipoItem.TIPO_CUARTO, "fa-user"),
                createItem("Cuarto compartido", "CUARTO_COMPARTIDO", TipoItem.TIPO_CUARTO, "fa-users"),
                createItem("Departamento", "DEPARTAMENTO", TipoItem.TIPO_CUARTO, "fa-building"),
                createItem("Mini depa", "MINI_DEPA", TipoItem.TIPO_CUARTO, "fa-home"),
                createItem("Casa", "CASA", TipoItem.TIPO_CUARTO, "fa-house"),
                createItem("Suite", "SUITE", TipoItem.TIPO_CUARTO, "fa-star")
            ));

            // REGLAS
            repository.saveAll(List.of(
                createItem("No se aceptan mascotas", "NO_MASCOTAS", TipoItem.REGLA, "fa-paw"),
                createItem("Prohibido fumar", "NO_FUMAR", TipoItem.REGLA, "fa-smoking-ban"),
                createItem("Solo Estudiantes", "SOLO_ESTUDIANTES", TipoItem.REGLA, "fa-graduation-cap"),
                createItem("Visitas hasta las 10 PM", "HORARIO_VISITAS", TipoItem.REGLA, "fa-clock")
            ));

            // PERIODOS
            repository.saveAll(List.of(
                createItem("Pago Mensual", "MENSUAL", TipoItem.PERIODO_ALQUILER, "fa-calendar-alt"),
                createItem("Pago Semestral (Ciclo)", "SEMESTRAL", TipoItem.PERIODO_ALQUILER, "fa-university"),
                createItem("Pago Anual", "ANUAL", TipoItem.PERIODO_ALQUILER, "fa-calendar-check")
            ));
        }

        // Sembrar incrementalmente si no existen
        if (repository.countByTipo(TipoItem.MOTIVO_CANCELACION) == 0) {
            log.info("Sembrando motivos de cancelación...");
            repository.saveAll(List.of(
                createItem("Cambio de planes de viaje", "CAMBIO_PLANES", TipoItem.MOTIVO_CANCELACION, "fa-plane-slash"),
                createItem("Problemas personales o de salud", "PROBLEMAS_PERSONALES", TipoItem.MOTIVO_CANCELACION, "fa-heartbeat"),
                createItem("Encontré otro alojamiento", "OTRO_ALOJAMIENTO", TipoItem.MOTIVO_CANCELACION, "fa-home"),
                createItem("Inconvenientes con las fechas", "INCONVENIENTE_FECHAS", TipoItem.MOTIVO_CANCELACION, "fa-calendar-times"),
                createItem("Error al realizar la reserva", "ERROR_RESERVA", TipoItem.MOTIVO_CANCELACION, "fa-exclamation-circle")
            ));
        }

        if (repository.countByTipo(TipoItem.MOTIVO_RECHAZO) == 0) {
            log.info("Sembrando motivos de rechazo...");
            repository.saveAll(List.of(
                createItem("Habitación no disponible", "NO_DISPONIBLE", TipoItem.MOTIVO_RECHAZO, "fa-ban"),
                createItem("El perfil del estudiante no coincide", "PERFIL_INCOMPATIBLE", TipoItem.MOTIVO_RECHAZO, "fa-user-times"),
                createItem("Precio o detalles incorrectos", "DETALLES_INCORRECTOS", TipoItem.MOTIVO_RECHAZO, "fa-edit"),
                createItem("Mantenimiento o reparaciones", "MANTENIMIENTO", TipoItem.MOTIVO_RECHAZO, "fa-wrench"),
                createItem("Falta de respuesta/comunicación", "FALTA_COMUNICACION", TipoItem.MOTIVO_RECHAZO, "fa-comments-slash")
            ));
        }

        if (repository.countByTipo(TipoItem.BANNER) == 0) {
            log.info("Sembrando banners informativos...");
            repository.saveAll(List.of(
                createBanner("¡Descuento en tu primer mes!", "/search", "local_offer", "Reserva y paga a través de la plataforma para obtener incentivos en tu comisión de alquiler."),
                createBanner("Completa tu verificación", "/student/profile?tab=verificacion", "verified_user", "Sube tu DNI en tu perfil de estudiante para que tus reservas se aprueben de forma prioritaria.")
            ));
        }
    }

    private ItemCatalogo createItem(String nombre, String valor, TipoItem tipo, String icono) {
        return ItemCatalogo.builder()
                .nombre(nombre)
                .valor(valor)
                .tipo(tipo)
                .icono(icono)
                .activo(true)
                .build();
    }

    private ItemCatalogo createBanner(String nombre, String valor, String icono, String descripcion) {
        return ItemCatalogo.builder()
                .nombre(nombre)
                .valor(valor)
                .tipo(TipoItem.BANNER)
                .icono(icono)
                .descripcion(descripcion)
                .activo(true)
                .build();
    }

    /**
     * Siembra UPeU como primera universidad + una zona de cobertura circular, si la tabla
     * está vacía. Reemplaza la constante "UPeU" antes quemada en el código. Coordenadas
     * alineadas con el ancla que usa hoy el frontend (lib/geo.ts: -11.99024, -76.83992).
     */
    private void seedUniversidades() {
        if (universidadRepository.count() > 0) {
            return;
        }
        log.info("Iniciando precarga de universidades...");

        Universidad upeu = universidadRepository.save(Universidad.builder()
                .nombre("Universidad Peruana Unión (Lima)")
                .descripcion("Campus Lima — Ñaña. Cobertura de cuartos para estudiantes.")
                .color("#bb0506")
                .latitud(-11.99024)
                .longitud(-76.83992)
                .activo(true)
                .esPrincipal(true)
                .build());

        zonaCoberturaRepository.save(ZonaCobertura.builder()
                .universidadId(upeu.getId())
                .nombre("Cobertura UPeU (15 km)")
                .descripcion("Radio de atención alrededor del campus.")
                .color("#bb0506")
                .activo(true)
                .ordenPrioridad(0)
                .tipoLimite(TipoLimite.CIRCULO)
                .latitud(-11.99024)
                .longitud(-76.83992)
                .radioKm(15.0)
                .build());

        log.info("Precarga de universidades completada (UPeU + zona círculo).");
    }

    /**
     * Siembra un set base de carreras (UPeU) si la tabla está vacía. Alimenta el
     * desplegable de carreras del registro de estudiantes. El admin puede ampliarlas
     * desde el panel de catálogos.
     */
    private void seedCarreras() {
        if (carreraRepository.count() > 0) {
            return;
        }
        log.info("Iniciando precarga de carreras...");
        List<Carrera> carreras = List.of(
                carrera("Ingeniería de Sistemas", "IS"),
                carrera("Ingeniería Civil", "IC"),
                carrera("Ingeniería Ambiental", "IA"),
                carrera("Ingeniería de Alimentos", "IAL"),
                carrera("Arquitectura", "ARQ"),
                carrera("Administración", "ADM"),
                carrera("Contabilidad", "CONT"),
                carrera("Marketing", "MKT"),
                carrera("Psicología", "PSI"),
                carrera("Enfermería", "ENF"),
                carrera("Nutrición Humana", "NUT"),
                carrera("Medicina Humana", "MED"),
                carrera("Educación", "EDU"),
                carrera("Ciencias de la Comunicación", "CCOM"),
                carrera("Teología", "TEO")
        );
        carreraRepository.saveAll(carreras);
        log.info("Precarga de carreras completada ({} carreras).", carreras.size());
    }

    private Carrera carrera(String nombre, String codigo) {
        return Carrera.builder()
                .nombre(nombre)
                .codigo(codigo)
                .activo(true)
                .build();
    }
}
