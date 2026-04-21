package com.alquilaya.serviciousuarios.validaciones.validators;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.DniPeruano;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Set;
import java.util.regex.Pattern;

public class DniPeruanoValidator implements ConstraintValidator<DniPeruano, String> {

    private static final Pattern FORMATO = Pattern.compile("^\\d{8}$");

    private static final Set<String> SECUENCIAS_TRIVIALES = Set.of(
            "00000000", "11111111", "22222222", "33333333", "44444444",
            "55555555", "66666666", "77777777", "88888888", "99999999",
            "12345678", "87654321");

    @Override
    public boolean isValid(String valor, ConstraintValidatorContext ctx) {
        if (valor == null || valor.isBlank()) {
            return true;
        }

        if (!FORMATO.matcher(valor).matches()) {
            reemplazarMensaje(ctx,
                    "El DNI '" + valor + "' no es válido: debe ser exactamente 8 dígitos numéricos");
            return false;
        }

        if (SECUENCIAS_TRIVIALES.contains(valor)) {
            reemplazarMensaje(ctx,
                    "El DNI '" + valor + "' es una secuencia trivial no permitida");
            return false;
        }

        return true;
    }

    private void reemplazarMensaje(ConstraintValidatorContext ctx, String mensaje) {
        ctx.disableDefaultConstraintViolation();
        ctx.buildConstraintViolationWithTemplate(mensaje).addConstraintViolation();
    }
}
