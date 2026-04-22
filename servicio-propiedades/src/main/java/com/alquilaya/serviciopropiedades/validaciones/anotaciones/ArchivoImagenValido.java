package com.alquilaya.serviciopropiedades.validaciones.anotaciones;

import com.alquilaya.serviciopropiedades.validaciones.validators.ArchivoImagenValidoValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = ArchivoImagenValidoValidator.class)
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
public @interface ArchivoImagenValido {
    String message() default "La imagen debe ser JPG, PNG o WEBP y pesar máximo 10 MB";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    long maxBytes() default 10L * 1024 * 1024;
}
