package com.alquilaya.serviciousuarios.validaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.RucPeruanoValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RucPeruanoValidatorTest {

    private RucPeruanoValidator validator;
    private ConstraintValidatorContext context;

    @BeforeEach
    void setUp() {
        validator = new RucPeruanoValidator();
        context = mock(ConstraintValidatorContext.class);
        ConstraintValidatorContext.ConstraintViolationBuilder builder = mock(ConstraintValidatorContext.ConstraintViolationBuilder.class);
        when(context.buildConstraintViolationWithTemplate(anyString())).thenReturn(builder);
        when(builder.addConstraintViolation()).thenReturn(context);
    }

    @ParameterizedTest
    @ValueSource(strings = {"20100030595", "10465893210", "20600652614"}) // 20600652614 -> Sum 117, 11-(117%11)=4
    void rucsValidosDeberianPasar(String ruc) {
        assertThat(validator.isValid(ruc, context)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"10465893214", "12345678901", "abcdefghijk", "21123456789"})
    void rucsInvalidosDeberianFallar(String ruc) {
        assertThat(validator.isValid(ruc, context)).isFalse();
    }
}
