package com.alquilaya.servicio_catalogos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class ServicioCatalogosApplication {

	public static void main(String[] args) {
		SpringApplication.run(ServicioCatalogosApplication.class, args);
	}

}
