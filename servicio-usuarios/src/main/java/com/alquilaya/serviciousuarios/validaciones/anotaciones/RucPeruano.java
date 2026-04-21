package com.alquilaya.serviciousuarios.validaciones.anotaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.RucPeruanoValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = RucPeruanoValidator.class)
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
public @interface RucPeruano {

    String message() default "El RUC no es válido según SUNAT. Debe ser un RUC peruano de 11 dígitos con dígito verificador correcto";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
