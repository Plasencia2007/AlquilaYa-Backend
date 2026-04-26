package com.alquilaya.serviciousuarios.validaciones.validators;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.ArchivoValido;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.web.multipart.MultipartFile;

import java.util.EnumSet;
import java.util.Set;

public class ArchivoValidoValidator implements ConstraintValidator<ArchivoValido, MultipartFile> {

    private static final Set<String> MIME_PERMITIDOS = Set.of("image/jpeg", "image/png", "application/pdf");
    private static final Set<MagicBytes.Kind> TIPOS_PERMITIDOS =
            EnumSet.of(MagicBytes.Kind.JPEG, MagicBytes.Kind.PNG, MagicBytes.Kind.PDF);
    private static final long MAX_SIZE = 5 * 1024 * 1024; // 5 MB

    @Override
    public boolean isValid(MultipartFile file, ConstraintValidatorContext ctx) {
        if (file == null || file.isEmpty()) return true;

        if (file.getSize() > MAX_SIZE) {
            return reject(ctx, "El archivo excede el tamaño máximo permitido de 5 MB");
        }

        // Defense-in-depth: MIME declarado + contenido real.
        String declared = file.getContentType();
        if (declared == null || !MIME_PERMITIDOS.contains(declared)) {
            return reject(ctx, "Solo se permiten archivos JPG, PNG o PDF");
        }
        MagicBytes.Kind real = MagicBytes.detect(file);
        if (!TIPOS_PERMITIDOS.contains(real)) {
            return reject(ctx, "El archivo no es realmente una imagen JPG/PNG ni un PDF válido");
        }
        if (!mimeMatches(real, declared)) {
            return reject(ctx, "El tipo declarado del archivo no coincide con su contenido real");
        }

        return true;
    }

    private static boolean mimeMatches(MagicBytes.Kind real, String declared) {
        return switch (real) {
            case JPEG -> "image/jpeg".equals(declared);
            case PNG -> "image/png".equals(declared);
            case PDF -> "application/pdf".equals(declared);
            default -> false;
        };
    }

    private static boolean reject(ConstraintValidatorContext ctx, String msg) {
        ctx.disableDefaultConstraintViolation();
        ctx.buildConstraintViolationWithTemplate(msg).addConstraintViolation();
        return false;
    }
}
