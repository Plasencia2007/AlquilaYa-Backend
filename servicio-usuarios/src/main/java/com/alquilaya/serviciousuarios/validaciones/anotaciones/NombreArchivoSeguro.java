package com.alquilaya.serviciousuarios.validaciones.anotaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.NombreArchivoSeguroValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = NombreArchivoSeguroValidator.class)
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
public @interface NombreArchivoSeguro {

    String message() default "El nombre de archivo solo puede contener letras, números, guiones y punto de extensión (ejemplo: foto123.jpg)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
