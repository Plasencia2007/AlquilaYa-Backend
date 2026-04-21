package com.alquilaya.serviciousuarios.validaciones.validators;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.ContrasenaSegura;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class ContrasenaSeguraValidator implements ConstraintValidator<ContrasenaSegura, String> {

    // Al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial
    // Permitimos un rango más amplio de caracteres especiales para evitar frustración del usuario
    private static final Pattern PATTERN = Pattern.compile(
        "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=._!*?&-])(?=\\S+$).{8,}$"
    );

    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        if (value == null || value.isBlank()) return true;
        return PATTERN.matcher(value).matches();
    }
}
