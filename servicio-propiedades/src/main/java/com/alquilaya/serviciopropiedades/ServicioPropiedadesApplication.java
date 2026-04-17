package com.alquilaya.serviciopropiedades;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class ServicioPropiedadesApplication {

	public static void main(String[] args) {
		SpringApplication.run(ServicioPropiedadesApplication.class, args);
	}

}
