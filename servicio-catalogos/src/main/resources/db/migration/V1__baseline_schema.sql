-- =====================================================================
-- V1 baseline: esquema COMPLETO de servicio-catalogos (BD alquilaya_catalogos, MySQL).
-- Generado desde el esquema real (ddl-auto en dev) para que una BD de prod
-- NUEVA + Flyway + ddl-auto=validate arranque sin fallar. Consolida y reemplaza
-- las migraciones previas (movidas a ../legacy/) que estaban DESFASADAS del modelo.
-- =====================================================================

CREATE TABLE `carreras` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activo` bit(1) NOT NULL,
  `codigo` varchar(20) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_carreras_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `items_catalogo` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activo` bit(1) DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `icono` varchar(255) DEFAULT NULL,
  `nombre` varchar(120) NOT NULL,
  `tipo` varchar(32) NOT NULL,
  `valor` varchar(60) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `universidades` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activo` bit(1) NOT NULL,
  `color` varchar(30) DEFAULT NULL,
  `descripcion` varchar(500) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `latitud` double DEFAULT NULL,
  `longitud` double DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `es_principal` bit(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_universidades_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `zonas_cobertura` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activo` bit(1) NOT NULL,
  `color` varchar(30) DEFAULT NULL,
  `descripcion` varchar(500) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `latitud` double DEFAULT NULL,
  `longitud` double DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `orden_prioridad` int NOT NULL,
  `poligono_json` text,
  `radio_km` double DEFAULT NULL,
  `tipo_limite` enum('CIRCULO','POLIGONO') NOT NULL,
  `universidad_id` bigint NOT NULL,
  `comision_monto` decimal(12,2) DEFAULT NULL,
  `comision_porcentaje` double DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
