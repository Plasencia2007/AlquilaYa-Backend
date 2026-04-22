package com.alquilaya.serviciopropiedades.validaciones.anotaciones;

import com.alquilaya.serviciopropiedades.validaciones.validators.CoordenadaLongitudValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = CoordenadaLongitudValidator.class)
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
public @interface CoordenadaLongitud {
    String message() default "La longitud debe estar entre -180 y 180 grados";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
