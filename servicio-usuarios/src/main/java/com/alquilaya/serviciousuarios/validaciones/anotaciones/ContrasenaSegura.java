package com.alquilaya.serviciousuarios.validaciones.anotaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.ContrasenaSeguraValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = ContrasenaSeguraValidator.class)
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
public @interface ContrasenaSegura {

    String message() default "La contraseña debe tener mínimo 8 caracteres e incluir al menos una mayúscula, una minúscula, un dígito y un carácter especial";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
