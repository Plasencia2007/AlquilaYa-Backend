package com.alquilaya.serviciousuarios.validaciones.validators;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.TelefonoPeruano;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class TelefonoPeruanoValidator implements ConstraintValidator<TelefonoPeruano, String> {
    private static final Pattern FORMATO = Pattern.compile("^\\+51\\d{9}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        if (value == null || value.isBlank()) return true;
        
        if (!FORMATO.matcher(value).matches()) {
            ctx.disableDefaultConstraintViolation();
            ctx.buildConstraintViolationWithTemplate(
                "El teléfono '" + value + "' no es válido. Debe empezar con +51 seguido de 9 dígitos (ejemplo: +51987654321)"
            ).addConstraintViolation();
            return false;
        }
        return true;
    }
}
