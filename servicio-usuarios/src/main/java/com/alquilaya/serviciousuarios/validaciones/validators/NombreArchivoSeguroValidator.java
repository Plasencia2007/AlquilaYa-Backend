package com.alquilaya.serviciousuarios.validaciones.validators;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.NombreArchivoSeguro;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class NombreArchivoSeguroValidator implements ConstraintValidator<NombreArchivoSeguro, String> {

    // Solo letras, números, guiones, guion bajo y punto de extensión. Sin espacios ni caracteres especiales.
    private static final Pattern PATTERN = Pattern.compile("^[a-zA-Z0-9._-]+$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        if (value == null || value.isBlank()) return true;

        if (!PATTERN.matcher(value).matches()) {
            ctx.disableDefaultConstraintViolation();
            ctx.buildConstraintViolationWithTemplate(
                "El nombre de archivo '" + value + "' contiene caracteres no permitidos. Use solo letras, números, guiones y puntos."
            ).addConstraintViolation();
            return false;
        }

        // Prevenir directory traversal básico
        if (value.contains("..") || value.contains("/") || value.contains("\\")) {
            ctx.disableDefaultConstraintViolation();
            ctx.buildConstraintViolationWithTemplate("El nombre de archivo no puede contener rutas").addConstraintViolation();
            return false;
        }

        return true;
    }
}
