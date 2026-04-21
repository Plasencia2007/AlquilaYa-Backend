package com.alquilaya.serviciousuarios.validaciones.validators;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.RucPeruano;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Set;
import java.util.regex.Pattern;

public class RucPeruanoValidator implements ConstraintValidator<RucPeruano, String> {

    private static final Pattern FORMATO = Pattern.compile("^\\d{11}$");

    private static final Set<String> PREFIJOS_VALIDOS = Set.of("10", "15", "17", "20");

    private static final int[] PESOS_SUNAT = { 5, 4, 3, 2, 7, 6, 5, 4, 3, 2 };

    @Override
    public boolean isValid(String valor, ConstraintValidatorContext ctx) {
        if (valor == null || valor.isBlank()) {
            return true;
        }

        if (!FORMATO.matcher(valor).matches()) {
            reemplazarMensaje(ctx,
                    "El RUC '" + valor + "' no es válido: debe tener exactamente 11 dígitos numéricos");
            return false;
        }

        String prefijo = valor.substring(0, 2);
        if (!PREFIJOS_VALIDOS.contains(prefijo)) {
            reemplazarMensaje(ctx,
                    "El RUC '" + valor + "' debe iniciar con 10, 15, 17 o 20 según el tipo de contribuyente SUNAT");
            return false;
        }

        if (!verificarDigitoControlSunat(valor)) {
            reemplazarMensaje(ctx,
                    "El RUC '" + valor + "' tiene un dígito verificador incorrecto según SUNAT");
            return false;
        }

        return true;
    }

    private boolean verificarDigitoControlSunat(String ruc) {
        int suma = 0;
        for (int i = 0; i < 10; i++) {
            int digito = Character.getNumericValue(ruc.charAt(i));
            suma += digito * PESOS_SUNAT[i];
        }
        int resto = suma % 11;
        int digitoEsperado = (11 - resto) % 10;
        int digitoRecibido = Character.getNumericValue(ruc.charAt(10));
        return digitoEsperado == digitoRecibido;
    }

    private void reemplazarMensaje(ConstraintValidatorContext ctx, String mensaje) {
        ctx.disableDefaultConstraintViolation();
        ctx.buildConstraintViolationWithTemplate(mensaje).addConstraintViolation();
    }
}
