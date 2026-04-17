# Protocolo de Trabajo AlquilaYa - IA de Desarrollo

Este documento define el flujo de trabajo estricto que la IA debe seguir para evitar regresiones y errores en el sistema distribuido.

## 1. Fase de Análisis (Error Detectado)
- **Alcance Total**: No se limita al archivo del error. Se debe inspeccionar:
    - **Frontend**: Servicios, interceptores de Axios y tipos.
    - **Gateway**: `api-gateway.yml` y mapeos de rutas.
    - **Config Server**: Archivos `.yml` centralizados.
    - **Microservicios**: Controladores, Seguridad y Logs entregados por el usuario.
- **Trazabilidad**: Seguir la ruta del paquete desde el Frontend -> Gateway -> Microservicio -> DB.

## 2. Fase de Planificación (Obligatoria)
- Crear un `implementation_plan.md`.
- Describir el **impacto** de cada cambio.
- Justificar por qué se realiza (basado en el análisis de la Fase 1).

## 3. Fase de Aprobación
- El usuario debe leer, comentar y marcar con un "okey" u otra señal de aprobación antes de ejecutar.
- **PROHIBIDO**: Aplicar cambios directos sin plan previo aprobado.

## 4. Fase de Ejecución y Verificación
- Seguir el plan paso a paso.
- Solicitar al usuario reinicio de servicios específicos.
- Verificar resultados con evidencia (logs o capturas).

## 5. Protocolo de Depuración en Microservicios (Reglas de Oro)
- **Caza de Fantasmas**: Antes de probar un cambio crítico, solicitar el cierre de TODAS las terminales de Java y usar `taskkill /f /im java.exe` si es necesario. Asegura que no haya instancias viejas en Eureka.
- **Soberanía del Config Server**: Nunca confiar en cambios en `application.properties` local. Todo cambio de puerto o secreto DEBE realizarse en el repositorio de configuración central del Config Server.
- **Bypass de SPEL**: Si un endpoint con `@PreAuthorize` da un Error 500 genérico, mover la validación a lógica manual dentro del controlador para obtener visibilidad total del error real.
- **Puertos Fijos**: Durante la fase de depuración de errores de red, fijar puertos específicos (ej. 8082) en el Config Server para evitar la ambigüedad del balanceo de carga del Gateway.

## 6. Fase de Cierre (Walkthrough)
- Resumen ejecutivo de qué se arregló.
- Actualización de este protocolo si se descubrió un nuevo patrón de error.
