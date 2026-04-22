package com.alquilaya.serviciopropiedades.validaciones.validators;

import com.alquilaya.serviciopropiedades.validaciones.anotaciones.CoordenadaLongitud;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CoordenadaLongitudValidator implements ConstraintValidator<CoordenadaLongitud, Double> {

    @Override
    public boolean isValid(Double value, ConstraintValidatorContext ctx) {
        if (value == null) return true;
        return value >= -180.0 && value <= 180.0;
    }
}
