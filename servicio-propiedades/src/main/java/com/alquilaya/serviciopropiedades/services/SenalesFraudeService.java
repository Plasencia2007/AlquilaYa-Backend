package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.dto.SenalFraudeDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.PropiedadImagen;
import com.alquilaya.serviciopropiedades.repositories.PropiedadImagenRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Detección heurística de avisos fraudulentos (#48) y catfishing (#50). NO es ML ni prueba
 * nada: son reglas baratas que marcan banderas rojas para que el admin priorice la revisión.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SenalesFraudeService {

    private final PropiedadRepository propiedadRepository;
    private final PropiedadImagenRepository propiedadImagenRepository;

    /** Mínimo de comparables para que la señal de precio sea estadísticamente útil. */
    private static final int MIN_COMPARABLES = 3;
    /** Por debajo de este % del promedio de zona, el precio es "demasiado bueno para ser verdad". */
    private static final double UMBRAL_PRECIO_BAJO = 0.5;

    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+\\.[\\w.-]+");
    private static final Pattern URL = Pattern.compile("(?i)(https?://|www\\.|\\b[\\w-]+\\.(com|pe|net|org)\\b)");
    private static final Pattern TELEFONO = Pattern.compile("(?:\\+?51)?\\s?9\\d{2}[\\s.\\-]?\\d{3}[\\s.\\-]?\\d{3}");
    private static final Pattern MENSAJERIA = Pattern.compile("(?i)(whats\\s?app|wsp|whats|telegram|t\\.me)");

    /** Calcula todas las señales para una propiedad. Lista vacía = sin banderas. */
    public List<SenalFraudeDTO> calcular(Propiedad p) {
        List<SenalFraudeDTO> senales = new ArrayList<>();
        if (p == null) return senales;

        revisarPrecio(p, senales);
        revisarContactoExterno(p, senales);
        revisarImagenesDuplicadas(p, senales);

        return senales;
    }

    private void revisarPrecio(Propiedad p, List<SenalFraudeDTO> out) {
        if (p.getPrecio() == null) return;
        try {
            List<Object[]> stats = propiedadRepository.estadisticasPrecio(
                    p.getZonaId(), p.getUniversidadId(), p.getTipoPropiedad());
            if (stats == null || stats.isEmpty() || stats.get(0)[1] == null) return;
            Object[] r = stats.get(0);
            double avg = ((Number) r[1]).doubleValue();
            long count = r[3] == null ? 0 : ((Number) r[3]).longValue();
            if (count < MIN_COMPARABLES || avg <= 0) return;
            double precio = p.getPrecio().doubleValue();
            if (precio < avg * UMBRAL_PRECIO_BAJO) {
                out.add(new SenalFraudeDTO(
                        "PRECIO_SOSPECHOSO",
                        String.format("Precio S/%.0f, muy por debajo del promedio de la zona (S/%.0f).", precio, avg),
                        "ALTA"));
            }
        } catch (Exception e) {
            log.warn("[FRAUDE] No se pudo evaluar precio de propiedad {}: {}", p.getId(), e.getMessage());
        }
    }

    private void revisarContactoExterno(Propiedad p, List<SenalFraudeDTO> out) {
        String texto = p.getDescripcion();
        if (texto == null || texto.isBlank()) return;
        boolean hay = EMAIL.matcher(texto).find()
                || TELEFONO.matcher(texto).find()
                || MENSAJERIA.matcher(texto).find()
                || URL.matcher(texto).find();
        if (hay) {
            out.add(new SenalFraudeDTO(
                    "CONTACTO_EXTERNO",
                    "La descripción incluye datos de contacto externo (teléfono/email/enlace) — posible intento de sacar el trato fuera de la plataforma.",
                    "MEDIA"));
        }
    }

    private void revisarImagenesDuplicadas(Propiedad p, List<SenalFraudeDTO> out) {
        try {
            List<PropiedadImagen> imagenes = propiedadImagenRepository.findByPropiedadIdOrderByOrdenAsc(p.getId());
            for (PropiedadImagen img : imagenes) {
                if (img.getUrl() == null) continue;
                long usos = propiedadImagenRepository.contarPropiedadesConImagen(img.getUrl());
                if (usos > 1) {
                    out.add(new SenalFraudeDTO(
                            "IMAGEN_DUPLICADA",
                            "Una o más fotos se usan también en otra publicación — posible catfishing/aviso clonado.",
                            "ALTA"));
                    return; // una bandera basta
                }
            }
        } catch (Exception e) {
            log.warn("[FRAUDE] No se pudo evaluar imágenes de propiedad {}: {}", p.getId(), e.getMessage());
        }
    }
}
