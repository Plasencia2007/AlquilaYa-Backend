package com.plasencia.servicio_mensajeria;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class ServicioMensajeriaApplication {

	public static void main(String[] args) {
		SpringApplication.run(ServicioMensajeriaApplication.class, args);
	}

}
