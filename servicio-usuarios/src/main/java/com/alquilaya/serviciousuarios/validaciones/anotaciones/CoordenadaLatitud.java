package com.alquilaya.serviciousuarios.validaciones.anotaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.CoordenadaLatitudValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = CoordenadaLatitudValidator.class)
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
public @interface CoordenadaLatitud {

    String message() default "La latitud debe estar entre -90 y 90 grados";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
