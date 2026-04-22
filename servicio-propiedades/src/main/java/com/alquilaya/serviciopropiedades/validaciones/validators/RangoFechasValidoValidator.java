package com.alquilaya.serviciopropiedades.validaciones.validators;

import com.alquilaya.serviciopropiedades.validaciones.anotaciones.RangoFechasValido;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.lang.reflect.Method;
import java.time.LocalDate;

public class RangoFechasValidoValidator implements ConstraintValidator<RangoFechasValido, Object> {

    private String inicio;
    private String fin;

    @Override
    public void initialize(RangoFechasValido constraintAnnotation) {
        this.inicio = constraintAnnotation.inicio();
        this.fin = constraintAnnotation.fin();
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext ctx) {
        if (value == null) return true;
        try {
            Method getInicio = value.getClass().getMethod(inicio);
            Method getFin = value.getClass().getMethod(fin);

            Object rawInicio = getInicio.invoke(value);
            Object rawFin = getFin.invoke(value);

            if (!(rawInicio instanceof LocalDate i) || !(rawFin instanceof LocalDate f)) {
                return true; // Dejamos que @NotNull se encargue si falta alguna
            }

            if (f.isBefore(i)) {
                ctx.disableDefaultConstraintViolation();
                ctx.buildConstraintViolationWithTemplate(
                        "La fecha de fin (" + f + ") no puede ser anterior a la fecha de inicio (" + i + ")")
                        .addConstraintViolation();
                return false;
            }
            return true;
        } catch (Exception e) {
            return true;
        }
    }
}
