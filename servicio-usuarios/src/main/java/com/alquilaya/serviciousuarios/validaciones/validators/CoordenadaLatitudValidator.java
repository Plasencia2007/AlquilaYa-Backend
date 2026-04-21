package com.alquilaya.serviciousuarios.validaciones.validators;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.CoordenadaLatitud;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CoordenadaLatitudValidator implements ConstraintValidator<CoordenadaLatitud, Double> {

    @Override
    public boolean isValid(Double value, ConstraintValidatorContext ctx) {
        if (value == null) return true;
        return value >= -90.0 && value <= 90.0;
    }
}
