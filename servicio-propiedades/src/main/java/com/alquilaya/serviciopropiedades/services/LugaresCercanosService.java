package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.dto.LugarCercanoDTO;
import com.alquilaya.serviciopropiedades.dto.TiempoCaminandoDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Proxy+caché server-side de dos APIs públicas externas sin SLA (Overpass API y el
 * servidor demo de OSRM), para que cada visitante de una ficha no golpee esas APIs
 * directamente desde el navegador (ítems 157/158). Cacheado en Redis 24h por propiedad
 * (ver {@link com.alquilaya.serviciopropiedades.config.RedisCacheConfig}) — los puntos de
 * interés/rutas cercanas a una propiedad casi nunca cambian. Réplica server-side de la
 * lógica que antes vivía en `property-nearby-places.tsx` (frontend).
 */
@Slf4j
@Service
public class LugaresCercanosService {

    private static final String OVERPASS_URL = "https://overpass-api.de/api/interpreter";
    private static final String OSRM_URL = "https://router.project-osrm.org/route/v1/foot/";
    private static final int RADIO_BUSQUEDA_M = 1200;
    private static final int MAX_POR_CATEGORIA = 3;
    private static final double RADIO_TIERRA_KM = 6371.0;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Lanza excepción en vez de devolver una lista vacía cuando Overpass falla — a propósito:
     * si el fallback se devolviera aquí, {@code @Cacheable} lo cachearía 24h igual que un
     * resultado real, "envenenando" el caché de esa propiedad con "sin lugares cercanos"
     * hasta que expire, aunque Overpass se recupere segundos después. Al lanzar, Spring NO
     * cachea el resultado (comportamiento estándar de {@code @Cacheable} ante una excepción),
     * así que el siguiente visitante reintenta con Overpass en vez de heredar el fallo. La
     * degradación graceful (devolver `[]` al usuario) vive en el controller, que no está cacheado.
     */
    @Cacheable("propiedades:lugaresCercanos")
    public List<LugarCercanoDTO> buscarCercanos(Long propiedadId, double lat, double lng) throws Exception {
        String query = construirQueryOverpass(lat, lng);
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(OVERPASS_URL))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "data=" + URLEncoder.encode(query, StandardCharsets.UTF_8)))
                .build();
        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) {
            throw new IllegalStateException("Overpass respondió " + res.statusCode() + " para propiedad " + propiedadId);
        }
        return parsearYAgrupar(res.body(), lat, lng);
    }

    /**
     * Igual que {@link #buscarCercanos}: lanza si OSRM falla o no devuelve ruta, en vez de
     * devolver la estimación aproximada aquí — así esa degradación NUNCA queda cacheada 24h.
     * El fallback (Haversine / 5 km/h) lo calcula el controller con {@link #haversineKm}
     * cuando esta llamada falla, sin pasar por el caché.
     */
    @Cacheable("propiedades:tiempoCaminando")
    public TiempoCaminandoDTO tiempoCaminando(Long propiedadId, double origenLat, double origenLng,
                                               double destinoLat, double destinoLng) throws Exception {
        String url = OSRM_URL + origenLng + "," + origenLat + ";" + destinoLng + "," + destinoLat + "?overview=false";
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() == 200) {
            JsonNode root = mapper.readTree(res.body());
            JsonNode rutas = root.path("routes");
            if ("Ok".equals(root.path("code").asText()) && rutas.isArray() && !rutas.isEmpty()) {
                JsonNode ruta = rutas.get(0);
                double duracionSeg = ruta.path("duration").asDouble();
                double distanciaM = ruta.path("distance").asDouble();
                return TiempoCaminandoDTO.builder()
                        .minutos(Math.max(1, (int) Math.round(duracionSeg / 60)))
                        .distanciaKm(distanciaM / 1000)
                        .aproximado(false)
                        .build();
            }
        }
        throw new IllegalStateException("OSRM no devolvió ruta válida para propiedad " + propiedadId);
    }

    private String construirQueryOverpass(double lat, double lng) {
        String alrededor = "around:" + RADIO_BUSQUEDA_M + "," + lat + "," + lng;
        return "[out:json][timeout:15];\n(\n"
                + "  node[\"amenity\"=\"university\"](" + alrededor + ");\n"
                + "  way[\"amenity\"=\"university\"](" + alrededor + ");\n"
                + "  node[\"shop\"=\"supermarket\"](" + alrededor + ");\n"
                + "  way[\"shop\"=\"supermarket\"](" + alrededor + ");\n"
                + "  node[\"amenity\"=\"marketplace\"](" + alrededor + ");\n"
                + "  node[\"amenity\"=\"pharmacy\"](" + alrededor + ");\n"
                + "  node[\"amenity\"=\"bank\"](" + alrededor + ");\n"
                + "  node[\"highway\"=\"bus_stop\"](" + alrededor + ");\n"
                + ");\nout center 60;";
    }

    private List<LugarCercanoDTO> parsearYAgrupar(String json, double origenLat, double origenLng) throws Exception {
        JsonNode root = mapper.readTree(json);
        JsonNode elementos = root.path("elements");
        Map<String, List<LugarCercanoDTO>> porCategoria = new LinkedHashMap<>();

        for (JsonNode el : elementos) {
            JsonNode tags = el.path("tags");
            String categoria = clasificar(tags);
            if (categoria == null) continue;

            Double lat = el.has("lat") ? el.path("lat").asDouble()
                    : (el.has("center") ? el.path("center").path("lat").asDouble() : null);
            Double lng = el.has("lon") ? el.path("lon").asDouble()
                    : (el.has("center") ? el.path("center").path("lon").asDouble() : null);
            if (lat == null || lng == null) continue;

            double distanciaM = haversineKm(origenLat, origenLng, lat, lng) * 1000;
            String nombre = tags.path("name").asText(null);
            if (nombre == null || nombre.isBlank()) nombre = nombreGenerico(categoria);

            LugarCercanoDTO dto = LugarCercanoDTO.builder()
                    .categoria(categoria).nombre(nombre).lat(lat).lng(lng).distanciaM(distanciaM)
                    .build();
            porCategoria.computeIfAbsent(categoria, k -> new ArrayList<>()).add(dto);
        }

        List<LugarCercanoDTO> resultado = new ArrayList<>();
        for (List<LugarCercanoDTO> lista : porCategoria.values()) {
            lista.sort(Comparator.comparingDouble(LugarCercanoDTO::getDistanciaM));
            resultado.addAll(lista.subList(0, Math.min(MAX_POR_CATEGORIA, lista.size())));
        }
        return resultado;
    }

    private String clasificar(JsonNode tags) {
        if (tags == null || tags.isMissingNode()) return null;
        String amenity = tags.path("amenity").asText(null);
        String shop = tags.path("shop").asText(null);
        String highway = tags.path("highway").asText(null);
        if ("university".equals(amenity)) return "universidad";
        if ("supermarket".equals(shop)) return "mercado";
        if ("marketplace".equals(amenity)) return "mercado";
        if ("pharmacy".equals(amenity)) return "farmacia";
        if ("bank".equals(amenity)) return "banco";
        if ("bus_stop".equals(highway)) return "paradero";
        return null;
    }

    private String nombreGenerico(String categoria) {
        return switch (categoria) {
            case "universidad" -> "Universidad";
            case "mercado" -> "Mercado";
            case "farmacia" -> "Farmacia";
            case "banco" -> "Banco";
            case "paradero" -> "Paradero de bus";
            default -> categoria;
        };
    }

    /**
     * Misma fórmula/constante que {@code PropiedadService#haversineKm}. Pública: la usa
     * también el controller para el fallback de {@link #tiempoCaminando} cuando OSRM falla
     * (ese fallback no debe pasar por el método cacheado — ver el javadoc de arriba).
     */
    public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                  * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return RADIO_TIERRA_KM * c;
    }
}
