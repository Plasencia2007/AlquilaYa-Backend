package com.alquilaya.serviciousuarios.validaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.TelefonoPeruanoValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TelefonoPeruanoValidatorTest {

    private TelefonoPeruanoValidator validator;
    private ConstraintValidatorContext context;

    @BeforeEach
    void setUp() {
        validator = new TelefonoPeruanoValidator();
        context = mock(ConstraintValidatorContext.class);
        ConstraintValidatorContext.ConstraintViolationBuilder builder = mock(ConstraintValidatorContext.ConstraintViolationBuilder.class);
        when(context.buildConstraintViolationWithTemplate(anyString())).thenReturn(builder);
        when(builder.addConstraintViolation()).thenReturn(context);
    }

    @ParameterizedTest
    @ValueSource(strings = {"+51987654321", "+51900000000", "+51999999999"})
    void telefonosValidosDeberianPasar(String tel) {
        assertThat(validator.isValid(tel, context)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"987654321", "51987654321", "+5198765432", "+511234567890", "abc", "+5198765432a"})
    void telefonosInvalidosDeberianFallar(String tel) {
        assertThat(validator.isValid(tel, context)).isFalse();
    }
}
