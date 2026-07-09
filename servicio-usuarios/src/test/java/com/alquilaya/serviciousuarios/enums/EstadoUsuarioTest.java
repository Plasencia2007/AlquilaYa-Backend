package com.alquilaya.serviciousuarios.enums;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contrato de {@link EstadoUsuario#bloqueaAcceso()}: qué estados impiden iniciar sesión.
 *
 * BANNED / REJECTED / SUSPENDED bloquean; PENDING y ACTIVE no (PENDING lo gobiernan
 * los gates de verificación de teléfono/email, no este flag).
 */
class EstadoUsuarioTest {

    @ParameterizedTest
    @EnumSource(value = EstadoUsuario.class, names = {"BANNED", "REJECTED", "SUSPENDED"})
    void estadosSancionadosBloqueanAcceso(EstadoUsuario estado) {
        assertThat(estado.bloqueaAcceso()).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = EstadoUsuario.class, names = {"PENDING", "ACTIVE"})
    void estadosHabilitablesNoBloqueanAcceso(EstadoUsuario estado) {
        assertThat(estado.bloqueaAcceso()).isFalse();
    }

    @Test
    void soloTresEstadosBloqueanEnTotal() {
        long bloqueantes = java.util.Arrays.stream(EstadoUsuario.values())
                .filter(EstadoUsuario::bloqueaAcceso)
                .count();
        assertThat(bloqueantes).isEqualTo(3);
    }
}
