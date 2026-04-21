package com.alquilaya.serviciousuarios.validaciones.anotaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.CercaDeUpeuValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = CercaDeUpeuValidator.class)
@Target({ TYPE })
@Retention(RUNTIME)
public @interface CercaDeUpeu {

    String message() default "La ubicación debe estar a menos de 15 km del campus UPeU. AlquilaYa solo atiende cuartos cercanos a la universidad";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    double radioKm() default 15.0;
}
