package com.alquilaya.serviciopropiedades.validaciones.validators;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

/**
 * Detección de tipo real por magic bytes. Independiente del `content-type` que envía
 * el cliente (que es trivialmente spoofeable). Valida los primeros bytes del archivo.
 */
public final class MagicBytes {

    public enum Kind { JPEG, PNG, GIF, WEBP, PDF, UNKNOWN }

    private MagicBytes() {}

    public static Kind detect(MultipartFile file) {
        if (file == null || file.isEmpty()) return Kind.UNKNOWN;
        byte[] head = new byte[12];
        try (InputStream in = file.getInputStream()) {
            int read = in.read(head);
            if (read < 4) return Kind.UNKNOWN;
            return detect(head, read);
        } catch (IOException e) {
            return Kind.UNKNOWN;
        }
    }

    private static Kind detect(byte[] b, int len) {
        if (len >= 3 && b[0] == (byte) 0xFF && b[1] == (byte) 0xD8 && b[2] == (byte) 0xFF) {
            return Kind.JPEG;
        }
        if (len >= 8 && b[0] == (byte) 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return Kind.PNG;
        }
        if (len >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8'
                && (b[4] == '7' || b[4] == '9') && b[5] == 'a') {
            return Kind.GIF;
        }
        if (len >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return Kind.WEBP;
        }
        if (len >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') {
            return Kind.PDF;
        }
        return Kind.UNKNOWN;
    }
}
