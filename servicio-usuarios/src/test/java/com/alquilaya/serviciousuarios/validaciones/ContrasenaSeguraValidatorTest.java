package com.alquilaya.serviciousuarios.validaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.ContrasenaSeguraValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class ContrasenaSeguraValidatorTest {

    private ContrasenaSeguraValidator validator;
    private ConstraintValidatorContext context;

    @BeforeEach
    void setUp() {
        validator = new ContrasenaSeguraValidator();
        context = mock(ConstraintValidatorContext.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"Pass123!", "Strong@2024", "Admin_123"})
    void contrasenasValidasDeberianPasar(String pass) {
        assertThat(validator.isValid(pass, context)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"password", "PASSWORD", "12345678", "Pass123", "short1!"})
    void contrasenasInvalidasDeberianFallar(String pass) {
        assertThat(validator.isValid(pass, context)).isFalse();
    }
}
