package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.Set;

/**
 * G4: genera el PDF del contrato de alquiler a partir de una reserva, y registra la
 * aceptación electrónica (timestamp) de cada parte. NO es firma criptográfica ni un
 * proveedor de firma digital real (DocuSign/Firma Perú) — es un placeholder honesto:
 * dos timestamps que confirman que cada parte aceptó los términos desde su cuenta
 * autenticada. Integrar un proveedor real queda como trabajo futuro.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContratoService {

    /** Sólo tiene sentido generar contrato cuando ya hay un acuerdo confirmado. */
    private static final Set<EstadoReserva> ESTADOS_CON_CONTRATO =
            EnumSet.of(EstadoReserva.APROBADA, EstadoReserva.PAGADA, EstadoReserva.FINALIZADA);

    private static final DateTimeFormatter FECHA_LARGA =
            DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new java.util.Locale("es", "PE"));

    private final ReservaRepository reservaRepository;
    private final PropiedadRepository propiedadRepository;
    private final UsuariosClient usuariosClient;

    /** Marca la aceptación electrónica del usuario autenticado (según su rol) sobre la reserva. */
    public Reserva firmar(Long reservaId, CurrentUser current) {
        Reserva r = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada: " + reservaId));
        if (!ESTADOS_CON_CONTRATO.contains(r.getEstado())) {
            throw new IllegalStateException("Esta reserva todavía no tiene un contrato para aceptar (estado: " + r.getEstado() + ")");
        }
        boolean esEstudiante = "ESTUDIANTE".equalsIgnoreCase(current.getRol()) && current.getPerfilId().equals(r.getEstudianteId());
        boolean esArrendador = "ARRENDADOR".equalsIgnoreCase(current.getRol()) && current.getPerfilId().equals(r.getArrendadorId());
        if (!esEstudiante && !esArrendador) {
            throw new IllegalStateException("Sólo las partes de la reserva pueden aceptar el contrato");
        }
        LocalDateTime ahora = LocalDateTime.now();
        if (esEstudiante && r.getFirmaEstudianteAt() == null) {
            r.setFirmaEstudianteAt(ahora);
        } else if (esArrendador && r.getFirmaArrendadorAt() == null) {
            r.setFirmaArrendadorAt(ahora);
        }
        // Idempotente: si ya había aceptado antes, no pisa el timestamp original.
        return reservaRepository.save(r);
    }

    /** Genera el PDF del contrato con los datos actuales de la reserva (incluida firma/no firma). */
    public byte[] generarPdf(Long reservaId) {
        Reserva r = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new IllegalArgumentException("Reserva no encontrada: " + reservaId));
        if (!ESTADOS_CON_CONTRATO.contains(r.getEstado())) {
            throw new IllegalStateException("Esta reserva todavía no tiene un contrato disponible (estado: " + r.getEstado() + ")");
        }
        Propiedad propiedad = propiedadRepository.findById(r.getPropiedadId())
                .orElseThrow(() -> new IllegalArgumentException("Propiedad no encontrada: " + r.getPropiedadId()));

        String estudiante = "Estudiante";
        String arrendador = "Arrendador";
        try {
            EstudianteInfoDTO est = usuariosClient.obtenerEstudiante(r.getEstudianteId());
            if (est != null) estudiante = (nvl(est.getNombre()) + " " + nvl(est.getApellido())).trim();
        } catch (Exception e) {
            log.warn("[Contrato] No se pudo obtener datos del estudiante {}: {}", r.getEstudianteId(), e.getMessage());
        }
        try {
            ArrendadorInfoDTO arr = usuariosClient.obtenerArrendador(r.getArrendadorId());
            if (arr != null) {
                arrendador = arr.getNombreComercial() != null && !arr.getNombreComercial().isBlank()
                        ? arr.getNombreComercial()
                        : (nvl(arr.getNombre()) + " " + nvl(arr.getApellido())).trim();
            }
        } catch (Exception e) {
            log.warn("[Contrato] No se pudo obtener datos del arrendador {}: {}", r.getArrendadorId(), e.getMessage());
        }

        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            var fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            var font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float margin = 55f;
            float y = page.getMediaBox().getHeight() - margin;
            float leading = 16f;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                y = titulo(cs, fontBold, margin, y, "CONTRATO DE ALQUILER - AlquilaYa");
                y -= 10;
                y = parrafo(cs, font, margin, y, leading, "Reserva No. " + r.getId()
                        + "  -  Generado el " + LocalDateTime.now().format(FECHA_LARGA));
                y -= 10;

                y = subtitulo(cs, fontBold, margin, y, "1. Partes");
                y = parrafo(cs, font, margin, y, leading, "Arrendador: " + arrendador);
                y = parrafo(cs, font, margin, y, leading, "Estudiante (arrendatario): " + estudiante);
                y -= 6;

                y = subtitulo(cs, fontBold, margin, y, "2. Inmueble");
                y = parrafo(cs, font, margin, y, leading, "Propiedad: " + nvl(propiedad.getTitulo()));
                y = parrafo(cs, font, margin, y, leading, "Dirección: " + nvl(propiedad.getDireccion()));
                y = parrafo(cs, font, margin, y, leading, "Tipo: " + nvl(propiedad.getTipoPropiedad()));
                y -= 6;

                y = subtitulo(cs, fontBold, margin, y, "3. Términos");
                y = parrafo(cs, font, margin, y, leading, "Período de alquiler: " + nvl(propiedad.getPeriodoAlquiler()));
                y = parrafo(cs, font, margin, y, leading, "Fecha de inicio: " + formatearFecha(r.getFechaInicio()));
                y = parrafo(cs, font, margin, y, leading, "Fecha de fin: " + formatearFecha(r.getFechaFin()));
                y = parrafo(cs, font, margin, y, leading, "Monto total: S/ " + r.getMontoTotal());
                y = parrafo(cs, font, margin, y, leading, "Estado de la reserva: " + r.getEstado());
                y -= 10;

                y = subtitulo(cs, fontBold, margin, y, "4. Aceptación electrónica de las partes");
                y = parrafo(cs, font, margin, y, leading, "Estudiante: " + estadoFirma(r.getFirmaEstudianteAt()));
                y = parrafo(cs, font, margin, y, leading, "Arrendador: " + estadoFirma(r.getFirmaArrendadorAt()));
                y -= 14;

                cs.setFont(font, 8);
                cs.beginText();
                cs.newLineAtOffset(margin, margin);
                cs.showText(asciiSeguro("Documento generado automáticamente por AlquilaYa. La aceptación electrónica registra un timestamp por"));
                cs.endText();
                cs.beginText();
                cs.newLineAtOffset(margin, margin - 10);
                cs.showText(asciiSeguro("cuenta autenticada; no constituye firma digital certificada."));
                cs.endText();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el PDF del contrato: " + e.getMessage(), e);
        }
    }

    private static String estadoFirma(LocalDateTime firmaAt) {
        return firmaAt == null
                ? "Pendiente de aceptación"
                : "Aceptado el " + firmaAt.format(FECHA_LARGA);
    }

    private static String formatearFecha(java.time.LocalDate fecha) {
        return fecha == null ? "—" : fecha.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private static String nvl(String s) {
        return s == null ? "—" : s;
    }

    private static float titulo(PDPageContentStream cs, PDType1Font font, float x, float y, String texto) throws IOException {
        cs.setFont(font, 16);
        cs.beginText();
        cs.newLineAtOffset(x, y);
        cs.showText(asciiSeguro(texto));
        cs.endText();
        return y - 22;
    }

    private static float subtitulo(PDPageContentStream cs, PDType1Font font, float x, float y, String texto) throws IOException {
        cs.setFont(font, 12);
        cs.beginText();
        cs.newLineAtOffset(x, y);
        cs.showText(asciiSeguro(texto));
        cs.endText();
        return y - 18;
    }

    private static float parrafo(PDPageContentStream cs, PDType1Font font, float x, float y, float leading, String texto) throws IOException {
        cs.setFont(font, 10.5f);
        cs.beginText();
        cs.newLineAtOffset(x, y);
        cs.showText(asciiSeguro(texto));
        cs.endText();
        return y - leading;
    }

    /**
     * Los Standard14 (Helvetica) de PDFBox no garantizan tildes/eñes/símbolos con
     * {@code showText()} (glifos fuera de su codificación por defecto se ven mal en algunos
     * visores). En vez de arriesgar un PDF con caracteres corruptos que no puedo verificar
     * visualmente en este entorno, se transliteran a ASCII — 100% legible en cualquier visor.
     * NFD descompone tildes/eñes (á→a+´→a); los símbolos sin descomposición (—, ·, º, ¿, ¡)
     * se reemplazan a mano.
     */
    private static String asciiSeguro(String texto) {
        if (texto == null) return "";
        String normalizado = Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalizado
                .replace('¿', '?').replace('¡', '!')
                .replace('—', '-').replace('–', '-')
                .replace('·', '-')
                .replace('º', 'o').replace('ª', 'a');
    }
}
