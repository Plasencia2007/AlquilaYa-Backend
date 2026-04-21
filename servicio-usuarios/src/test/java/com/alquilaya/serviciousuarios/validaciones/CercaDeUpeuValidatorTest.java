package com.alquilaya.serviciousuarios.validaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.CercaDeUpeuValidator;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.CercaDeUpeu;
import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CercaDeUpeuValidatorTest {

    private CercaDeUpeuValidator validator;
    private ConstraintValidatorContext context;

    // Se hace pública la clase para que la reflexión en el validador no tenga problemas de acceso
    public static class MockUbicacion {
        private final Double latitud;
        private final Double longitud;

        public MockUbicacion(Double latitud, Double longitud) {
            this.latitud = latitud;
            this.longitud = longitud;
        }

        public Double getLatitud() { return latitud; }
        public Double getLongitud() { return longitud; }
    }

    @BeforeEach
    void setUp() {
        validator = new CercaDeUpeuValidator();
        CercaDeUpeu annotation = mock(CercaDeUpeu.class);
        when(annotation.radioKm()).thenReturn(15.0);
        validator.initialize(annotation);
        
        context = mock(ConstraintValidatorContext.class);
        ConstraintValidatorContext.ConstraintViolationBuilder builder = mock(ConstraintValidatorContext.ConstraintViolationBuilder.class);
        when(context.buildConstraintViolationWithTemplate(anyString())).thenReturn(builder);
        when(builder.addConstraintViolation()).thenReturn(context);
    }

    @Test
    void ubicacionCercanaDeberiaPasar() {
        // Ñaña está muy cerca de UPeU
        MockUbicacion nania = new MockUbicacion(-11.992, -76.840);
        assertThat(validator.isValid(nania, context)).isTrue();
    }

    @Test
    void ubicacionLejanaDeberiaFallar() {
        // Miraflores está a unos 25km de Ñaña
        MockUbicacion miraflores = new MockUbicacion(-12.1211, -77.0297);
        assertThat(validator.isValid(miraflores, context)).isFalse();
    }
}
