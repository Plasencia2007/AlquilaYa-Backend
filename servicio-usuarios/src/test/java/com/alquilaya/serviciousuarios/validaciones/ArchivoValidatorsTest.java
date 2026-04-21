package com.alquilaya.serviciousuarios.validaciones;

import com.alquilaya.serviciousuarios.validaciones.validators.ArchivoValidoValidator;
import com.alquilaya.serviciousuarios.validaciones.validators.NombreArchivoSeguroValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ArchivoValidatorsTest {

    private ArchivoValidoValidator archivoValidoValidator;
    private NombreArchivoSeguroValidator nombreSeguroValidator;
    private ConstraintValidatorContext context;

    @BeforeEach
    void setUp() {
        archivoValidoValidator = new ArchivoValidoValidator();
        nombreSeguroValidator = new NombreArchivoSeguroValidator();
        context = mock(ConstraintValidatorContext.class);
        ConstraintValidatorContext.ConstraintViolationBuilder builder = mock(ConstraintValidatorContext.ConstraintViolationBuilder.class);
        when(context.buildConstraintViolationWithTemplate(anyString())).thenReturn(builder);
        when(builder.addConstraintViolation()).thenReturn(context);
    }

    @Test
    void archivoValidoDeberiaPasar() {
        MockMultipartFile file = new MockMultipartFile("archivo", "foto.jpg", "image/jpeg", new byte[100]);
        assertThat(archivoValidoValidator.isValid(file, context)).isTrue();
    }

    @Test
    void archivoDemasiadoGrandeDeberiaFallar() {
        byte[] largeContent = new byte[6 * 1024 * 1024]; // 6MB
        MockMultipartFile file = new MockMultipartFile("archivo", "foto.jpg", "image/jpeg", largeContent);
        assertThat(archivoValidoValidator.isValid(file, context)).isFalse();
    }

    @Test
    void tipoArchivoNoPermitidoDeberiaFallar() {
        MockMultipartFile file = new MockMultipartFile("archivo", "virus.exe", "application/x-msdownload", new byte[100]);
        assertThat(archivoValidoValidator.isValid(file, context)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"foto.jpg", "documento-final.pdf", "perfil_123.png"})
    void nombresSegurosDeberianPasar(String nombre) {
        assertThat(nombreSeguroValidator.isValid(nombre, context)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"../../../etc/passwd", "archivo con espacios.jpg", "script<script>.js", "foto!.jpg"})
    void nombresInsegurosDeberianFallar(String nombre) {
        assertThat(nombreSeguroValidator.isValid(nombre, context)).isFalse();
    }
}
