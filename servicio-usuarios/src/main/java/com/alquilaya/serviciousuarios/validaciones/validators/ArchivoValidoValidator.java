package com.alquilaya.serviciousuarios.validaciones.validators;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.ArchivoValido;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.web.multipart.MultipartFile;
import java.util.Set;

public class ArchivoValidoValidator implements ConstraintValidator<ArchivoValido, MultipartFile> {

    private static final Set<String> EXTENSIONES_PERMITIDAS = Set.of("image/jpeg", "image/png", "application/pdf");
    private static final long MAX_SIZE = 5 * 1024 * 1024; // 5 MB

    @Override
    public boolean isValid(MultipartFile file, ConstraintValidatorContext ctx) {
        if (file == null || file.isEmpty()) return true;

        if (file.getSize() > MAX_SIZE) {
            ctx.disableDefaultConstraintViolation();
            ctx.buildConstraintViolationWithTemplate("El archivo excede el tamaño máximo permitido de 5 MB").addConstraintViolation();
            return false;
        }

        if (!EXTENSIONES_PERMITIDAS.contains(file.getContentType())) {
            ctx.disableDefaultConstraintViolation();
            ctx.buildConstraintViolationWithTemplate("Solo se permiten archivos JPG, PNG o PDF").addConstraintViolation();
            return false;
        }

        return true;
    }
}
