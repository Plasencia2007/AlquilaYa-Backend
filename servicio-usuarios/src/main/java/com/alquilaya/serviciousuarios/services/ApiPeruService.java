package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.ApiPeruDTOs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class ApiPeruService {

    @Value("${apiperu.url:https://apiperu.dev/api}")
    private String apiUrl;

    @Value("${apiperu.token:}")
    private String apiToken;

    private final RestTemplate restTemplate = new RestTemplate();

    public ApiPeruDTOs.DniResponse consultarDni(String dni) {
        log.info("Consultando DNI {} en apiperu.dev", dni);
        if (apiToken == null || apiToken.isBlank()) {
            log.warn("Token de Apiperu.dev no configurado. Se cancela la consulta.");
            ApiPeruDTOs.DniResponse response = new ApiPeruDTOs.DniResponse();
            response.setSuccess(false);
            response.setMessage("El servicio de consulta de identidad no está configurado (falta token).");
            return response;
        }

        try {
            String url = apiUrl + "/dni";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiToken.trim());
            headers.set("Accept", "application/json");

            ApiPeruDTOs.DniRequest requestBody = ApiPeruDTOs.DniRequest.builder().dni(dni).build();
            HttpEntity<ApiPeruDTOs.DniRequest> entity = new HttpEntity<>(requestBody, headers);

            ApiPeruDTOs.DniResponse response = restTemplate.postForObject(url, entity, ApiPeruDTOs.DniResponse.class);
            if (response == null) {
                log.error("Respuesta nula obtenida de apiperu.dev para DNI {}", dni);
                ApiPeruDTOs.DniResponse errRes = new ApiPeruDTOs.DniResponse();
                errRes.setSuccess(false);
                errRes.setMessage("No se pudo obtener respuesta del servicio de identidad.");
                return errRes;
            }
            return response;
        } catch (Exception e) {
            log.error("Error al consultar DNI {} en apiperu.dev: {}", dni, e.getMessage(), e);
            ApiPeruDTOs.DniResponse errRes = new ApiPeruDTOs.DniResponse();
            errRes.setSuccess(false);
            errRes.setMessage("Error de comunicación con el servicio de identidad: " + e.getMessage());
            return errRes;
        }
    }

    public ApiPeruDTOs.RucResponse consultarRuc(String ruc) {
        log.info("Consultando RUC {} en apiperu.dev", ruc);
        if (apiToken == null || apiToken.isBlank()) {
            log.warn("Token de Apiperu.dev no configurado. Se cancela la consulta.");
            ApiPeruDTOs.RucResponse response = new ApiPeruDTOs.RucResponse();
            response.setSuccess(false);
            response.setMessage("El servicio de consulta de RUC no está configurado (falta token).");
            return response;
        }

        try {
            String url = apiUrl + "/ruc";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiToken.trim());
            headers.set("Accept", "application/json");

            ApiPeruDTOs.RucRequest requestBody = ApiPeruDTOs.RucRequest.builder().ruc(ruc).build();
            HttpEntity<ApiPeruDTOs.RucRequest> entity = new HttpEntity<>(requestBody, headers);

            ApiPeruDTOs.RucResponse response = restTemplate.postForObject(url, entity, ApiPeruDTOs.RucResponse.class);
            if (response == null) {
                log.error("Respuesta nula obtenida de apiperu.dev para RUC {}", ruc);
                ApiPeruDTOs.RucResponse errRes = new ApiPeruDTOs.RucResponse();
                errRes.setSuccess(false);
                errRes.setMessage("No se pudo obtener respuesta del servicio de consulta RUC.");
                return errRes;
            }
            return response;
        } catch (Exception e) {
            log.error("Error al consultar RUC {} en apiperu.dev: {}", ruc, e.getMessage(), e);
            ApiPeruDTOs.RucResponse errRes = new ApiPeruDTOs.RucResponse();
            errRes.setSuccess(false);
            errRes.setMessage("Error de comunicación con el servicio RUC: " + e.getMessage());
            return errRes;
        }
    }
}
