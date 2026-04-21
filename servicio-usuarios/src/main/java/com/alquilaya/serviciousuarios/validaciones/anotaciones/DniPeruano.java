package com.alquilaya.serviciousuarios.validaciones.anotaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.DniPeruanoValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = DniPeruanoValidator.class)
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
public @interface DniPeruano {

    String message() default "El DNI debe tener 8 dígitos numéricos válidos (por ejemplo: 46589321)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
