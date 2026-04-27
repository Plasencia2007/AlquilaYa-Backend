package com.alquilaya.servicio_catalogos.config;

import com.alquilaya.servicio_catalogos.entities.ItemCatalogo;
import com.alquilaya.servicio_catalogos.enums.TipoItem;
import com.alquilaya.servicio_catalogos.repositories.ItemCatalogoRepository;
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

    @Override
    public void run(String... args) {
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
                createItem("Cuarto Individual", "INDIVIDUAL", TipoItem.TIPO_CUARTO, "fa-user"),
                createItem("Cuarto Compartido (2 pers)", "COMPARTIDO", TipoItem.TIPO_CUARTO, "fa-users"),
                createItem("Mini-Departamento", "MINI_DEPTO", TipoItem.TIPO_CUARTO, "fa-home"),
                createItem("Suite de Lujo", "SUITE", TipoItem.TIPO_CUARTO, "fa-star")
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

            log.info("Precarga de catálogo completada exitosamente.");
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
}
