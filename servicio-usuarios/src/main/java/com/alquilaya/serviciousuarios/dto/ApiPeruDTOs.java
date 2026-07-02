package com.alquilaya.serviciousuarios.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class ApiPeruDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DniRequest {
        private String dni;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DniResponse {
        private boolean success;
        private DniData data;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DniData {
        private String numero;
        @JsonProperty("nombre_completo")
        private String nombreCompleto;
        private String nombres;
        @JsonProperty("apellido_paterno")
        private String apellidoPaterno;
        @JsonProperty("apellido_materno")
        private String apellidoMaterno;
        @JsonProperty("codigo_verificacion")
        private String codigoVerificacion;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RucRequest {
        private String ruc;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RucResponse {
        private boolean success;
        private RucData data;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RucData {
        private String ruc;
        @JsonProperty("nombre_o_razon_social")
        private String nombreORazonSocial;
        private String estado;
        private String condicion;
        private String direccion;
        private String departamento;
        private String provincia;
        private String distrito;
    }
}
