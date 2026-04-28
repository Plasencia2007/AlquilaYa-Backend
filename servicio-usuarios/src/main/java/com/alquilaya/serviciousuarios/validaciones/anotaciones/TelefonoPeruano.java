package com.alquilaya.serviciousuarios.validaciones.anotaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.TelefonoPeruanoValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = TelefonoPeruanoValidator.class)
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
public @interface TelefonoPeruano {

    String message() default "El teléfono debe tener formato peruano +51 seguido de 9 dígitos que empiecen con 9 (ejemplo: +51987654321)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
