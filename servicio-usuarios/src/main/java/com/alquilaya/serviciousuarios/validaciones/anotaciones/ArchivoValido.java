package com.alquilaya.serviciousuarios.validaciones.anotaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.ArchivoValidoValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = ArchivoValidoValidator.class)
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
public @interface ArchivoValido {

    String message() default "El archivo debe ser JPG, PNG o PDF, y pesar máximo 5 MB";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    long maxBytes() default 5L * 1024 * 1024;

    String[] extensionesPermitidas() default { "jpg", "jpeg", "png", "pdf" };

    String[] tiposMimePermitidos() default { "image/jpeg", "image/png", "application/pdf" };
}
