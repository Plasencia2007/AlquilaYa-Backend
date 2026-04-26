package com.alquilaya.serviciopropiedades.validaciones.validators;

import com.alquilaya.serviciopropiedades.validaciones.anotaciones.ArchivoImagenValido;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

public class ArchivoImagenValidoValidator implements ConstraintValidator<ArchivoImagenValido, MultipartFile> {

    public static final Set<String> MIME_PERMITIDOS = Set.of("image/jpeg", "image/png", "image/webp");
    public static final long MAX_BYTES_DEFAULT = 10L * 1024 * 1024;

    private long maxBytes;

    @Override
    public void initialize(ArchivoImagenValido constraintAnnotation) {
        this.maxBytes = constraintAnnotation.maxBytes();
    }

    @Override
    public boolean isValid(MultipartFile file, ConstraintValidatorContext ctx) {
        String error = validar(file, maxBytes);
        if (error == null) return true;
        ctx.disableDefaultConstraintViolation();
        ctx.buildConstraintViolationWithTemplate(error).addConstraintViolation();
        return false;
    }

    /** Devuelve null si el archivo es válido, o un mensaje de error. Útil para validación imperativa. */
    public static String validar(MultipartFile file, long maxBytes) {
        if (file == null || file.isEmpty()) return null;
        if (file.getSize() > maxBytes) {
            return String.format("La imagen excede el tamaño máximo permitido de %d MB", maxBytes / (1024 * 1024));
        }
        String contentType = file.getContentType();
        if (contentType == null || !MIME_PERMITIDOS.contains(contentType)) {
            return "Solo se permiten imágenes JPG, PNG o WEBP";
        }
        // Defense-in-depth: además del MIME declarado, verificamos el contenido real.
        MagicBytes.Kind real = MagicBytes.detect(file);
        boolean coincide = switch (real) {
            case JPEG -> "image/jpeg".equals(contentType);
            case PNG -> "image/png".equals(contentType);
            case WEBP -> "image/webp".equals(contentType);
            default -> false;
        };
        if (!coincide) {
            return "El archivo no es realmente una imagen JPG, PNG o WEBP válida";
        }
        return null;
    }

    public static String validar(MultipartFile file) {
        return validar(file, MAX_BYTES_DEFAULT);
    }
}
