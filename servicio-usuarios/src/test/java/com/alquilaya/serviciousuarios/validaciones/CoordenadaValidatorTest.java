package com.alquilaya.serviciousuarios.validaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.CoordenadaLatitudValidator;
import com.alquilaya.serviciousuarios.validaciones.validators.CoordenadaLongitudValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class CoordenadaValidatorTest {

    private CoordenadaLatitudValidator latValidator;
    private CoordenadaLongitudValidator lonValidator;
    private ConstraintValidatorContext context;

    @BeforeEach
    void setUp() {
        latValidator = new CoordenadaLatitudValidator();
        lonValidator = new CoordenadaLongitudValidator();
        context = mock(ConstraintValidatorContext.class);
    }

    @ParameterizedTest
    @ValueSource(doubles = {-90.0, 0.0, 90.0, -12.0431})
    void latitudesValidasDeberianPasar(Double val) {
        assertThat(latValidator.isValid(val, context)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(doubles = {-90.1, 90.1, 100.0})
    void latitudesInvalidasDeberianFallar(Double val) {
        assertThat(latValidator.isValid(val, context)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(doubles = {-180.0, 0.0, 180.0, -76.9529})
    void longitudesValidasDeberianPasar(Double val) {
        assertThat(lonValidator.isValid(val, context)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(doubles = {-180.1, 180.1, 200.0})
    void longitudesInvalidasDeberianFallar(Double val) {
        assertThat(lonValidator.isValid(val, context)).isFalse();
    }
}
