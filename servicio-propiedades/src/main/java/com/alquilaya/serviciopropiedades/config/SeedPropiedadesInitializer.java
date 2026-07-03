package com.alquilaya.serviciopropiedades.config;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.PropiedadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Carga propiedades de prueba para desarrollo: 4 para el arrendador principal y 2
 * para el secundario. Todas quedan {@link EstadoPropiedad#APROBADO}, aprobadas por
 * admin y disponibles, dentro del radio de UPeU, para que aparezcan en la búsqueda
 * pública sin pasos manuales.
 *
 * <p>Solo se ejecuta si la tabla de propiedades está <b>vacía</b> (coincide con
 * "cargar solo cuando no hay datos"). Desactivable con
 * {@code alquilaya.seed.enabled=false}.</p>
 *
 * <p>El dueño de cada propiedad es el {@code perfilId} del Arrendador en
 * servicio-usuarios. En una BD recién reiniciada son 1 ({@code arrendador@}) y 2
 * ({@code arrendador2@}); ambos son configurables vía
 * {@code alquilaya.seed.arrendador1-perfil-id} / {@code arrendador2-perfil-id}.</p>
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class SeedPropiedadesInitializer implements CommandLineRunner {

    /** Imagen de portada genérica para que las tarjetas no salgan vacías. */
    private static final String IMG_PLACEHOLDER =
            "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=70";

    private final PropiedadRepository propiedadRepository;
    private final PropiedadService propiedadService;

    @Value("${alquilaya.seed.enabled:true}")
    private boolean seedEnabled;

    @Value("${alquilaya.seed.arrendador1-perfil-id:1}")
    private Long arrendador1;

    @Value("${alquilaya.seed.arrendador2-perfil-id:2}")
    private Long arrendador2;

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            log.info("[SEED] alquilaya.seed.enabled=false — no se cargan propiedades de prueba.");
            return;
        }
        if (propiedadRepository.count() > 0) {
            log.debug("[SEED] Ya existen propiedades — no se cargan datos de prueba.");
            return;
        }

        List<Propiedad> seeds = new ArrayList<>();

        // ---- 4 propiedades de arrendador@ (perfilId = arrendador1) ----
        seeds.add(nueva("Cuarto individual amoblado a 5 min de UPeU", 450,
                "Av. Central 123, Ñaña, Lurigancho-Chosica", arrendador1,
                "INDIVIDUAL", "MENSUAL", -11.9885, -76.8965, 16.0, 2,
                List.of("WIFI", "AGUA_CALIENTE", "LUZ"),
                List.of("SOLO_ESTUDIANTES", "NO_FUMAR"),
                "Cuarto luminoso con baño propio, escritorio, closet y cama de 1.5 plazas. "
                        + "Ideal para estudiante. A 5 minutos caminando del campus UPeU.",
                "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=70"));

        seeds.add(nueva("Cuarto compartido económico para 2 estudiantes", 280,
                "Jr. Los Pinos 234, Ñaña, Lurigancho-Chosica", arrendador1,
                "COMPARTIDO", "MENSUAL", -11.9905, -76.8950, 22.0, 1,
                List.of("WIFI", "LUZ", "LAVANDERIA"),
                List.of("SOLO_ESTUDIANTES", "NO_MASCOTAS", "HORARIO_VISITAS"),
                "Habitación compartida para dos personas, con literas, ropero y zona de "
                        + "estudio. Lavandería compartida incluida. Precio por persona.",
                "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=70"));

        seeds.add(nueva("Mini-departamento independiente cerca al campus", 750,
                "Av. Los Eucaliptos 567, Ñaña, Lurigancho-Chosica", arrendador1,
                "MINI_DEPTO", "SEMESTRAL", -11.9840, -76.9010, 35.0, 3,
                List.of("WIFI", "AGUA_CALIENTE", "LUZ", "COCINA", "ENTRADA_IND"),
                List.of("NO_FUMAR"),
                "Mini-departamento con cocina equipada, baño propio y entrada independiente. "
                        + "Perfecto para quien busca privacidad. Pago por ciclo.",
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=70"));

        seeds.add(nueva("Suite amoblada premium con todos los servicios", 1100,
                "Calle Las Magnolias 890, Ñaña, Lurigancho-Chosica", arrendador1,
                "SUITE", "MENSUAL", -11.9862, -76.8940, 45.0, 4,
                List.of("WIFI", "AGUA_CALIENTE", "LUZ", "COCINA", "LAVANDERIA", "ENTRADA_IND"),
                List.of("NO_FUMAR", "NO_MASCOTAS"),
                "Suite de lujo totalmente amoblada, cocina completa, smart TV y vista a la "
                        + "ciudad. Servicios incluidos en el precio.",
                "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=70"));

        // ---- 2 propiedades de arrendador2@ (perfilId = arrendador2) ----
        seeds.add(nueva("Cuarto individual con WiFi y agua caliente", 400,
                "Jr. Las Flores 456, Ñaña, Lurigancho-Chosica", arrendador2,
                "INDIVIDUAL", "MENSUAL", -11.9892, -76.8932, 14.0, 1,
                List.of("WIFI", "AGUA_CALIENTE", "LUZ"),
                List.of("SOLO_ESTUDIANTES"),
                "Cuarto cómodo y seguro en residencia estudiantil. Incluye internet de alta "
                        + "velocidad y agua caliente las 24h.",
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=70"));

        seeds.add(nueva("Cuarto compartido en residencia estudiantil", 250,
                "Jr. Las Flores 458, Ñaña, Lurigancho-Chosica", arrendador2,
                "COMPARTIDO", "MENSUAL", -11.9830, -76.9005, 20.0, 2,
                List.of("WIFI", "LUZ", "LAVANDERIA", "COCINA"),
                List.of("SOLO_ESTUDIANTES", "NO_FUMAR", "HORARIO_VISITAS"),
                "Ambiente tranquilo para estudiar, con cocina y lavandería compartidas. "
                        + "Convivencia entre estudiantes UPeU.",
                "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=70"));

        for (Propiedad p : seeds) {
            propiedadService.calcularYSetearDistancia(p);
            propiedadRepository.save(p);
        }
        log.info("[SEED] {} propiedades de prueba creadas (arrendadores perfilId={} y {}).",
                seeds.size(), arrendador1, arrendador2);
    }

    private Propiedad nueva(String titulo, int precio, String direccion, Long arrendadorId,
                            String tipo, String periodo, double lat, double lon,
                            double area, int piso, List<String> servicios, List<String> reglas,
                            String descripcion, String imagenUrl) {
        return Propiedad.builder()
                .titulo(titulo)
                .descripcion(descripcion)
                .precio(BigDecimal.valueOf(precio))
                .direccion(direccion)
                .arrendadorId(arrendadorId)
                .tipoPropiedad(tipo)
                .periodoAlquiler(periodo)
                .latitud(lat)
                .longitud(lon)
                .area(area)
                .nroPiso(piso)
                .serviciosIncluidos(new ArrayList<>(servicios))
                .reglas(new ArrayList<>(reglas))
                .imagenUrl(imagenUrl)
                .imagenes(new ArrayList<>())
                .estaDisponible(true)
                .estado(EstadoPropiedad.APROBADO)
                .aprobadoPorAdmin(true)
                .build();
    }
}
