package com.alquilaya.serviciousuarios;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

// Bug real preexistente arreglado acá: faltaba @EnableFeignClients pese a que
// CatalogosClient (usado por CampusProvider) ya era un @FeignClient — sin esta
// anotación, Spring nunca registra su bean y el arranque falla en cuanto se
// inyecta (NoSuchBeanDefinitionException). Mismo patrón que ya usan
// servicio-propiedades/servicio-pagos/servicio-mensajeria.
@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients
@EnableAsync
@EnableScheduling
public class ServicioUsuariosApplication {

	public static void main(String[] args) {
		SpringApplication.run(ServicioUsuariosApplication.class, args);
	}

}
