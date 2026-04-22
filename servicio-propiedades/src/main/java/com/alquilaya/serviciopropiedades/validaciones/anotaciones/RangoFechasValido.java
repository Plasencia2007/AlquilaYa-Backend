package com.alquilaya.serviciopropiedades.validaciones.anotaciones;

import com.alquilaya.serviciopropiedades.validaciones.validators.RangoFechasValidoValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = RangoFechasValidoValidator.class)
@Target({ TYPE })
@Retention(RUNTIME)
public @interface RangoFechasValido {
    String message() default "La fecha de fin debe ser posterior o igual a la fecha de inicio";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};

    /** Nombre del getter para la fecha de inicio (ej: "getFechaInicio"). */
    String inicio() default "getFechaInicio";

    /** Nombre del getter para la fecha de fin (ej: "getFechaFin"). */
    String fin() default "getFechaFin";
}
