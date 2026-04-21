package com.alquilaya.serviciousuarios.validaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.DniPeruanoValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DniPeruanoValidatorTest {

    private DniPeruanoValidator validator;
    private ConstraintValidatorContext context;

    @BeforeEach
    void setUp() {
        validator = new DniPeruanoValidator();
        context = mock(ConstraintValidatorContext.class);
        ConstraintValidatorContext.ConstraintViolationBuilder builder = mock(ConstraintValidatorContext.ConstraintViolationBuilder.class);
        when(context.buildConstraintViolationWithTemplate(anyString())).thenReturn(builder);
        when(builder.addConstraintViolation()).thenReturn(context);
    }

    @ParameterizedTest
    @ValueSource(strings = {"46589321", "10203040", "70605040"})
    void dnisValidosDeberianPasar(String dni) {
        assertThat(validator.isValid(dni, context)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"12345678", "87654321", "11111111", "00000000", "1234567", "abcdefgh"})
    void dnisInvalidosDeberianFallar(String dni) {
        assertThat(validator.isValid(dni, context)).isFalse();
    }
}
