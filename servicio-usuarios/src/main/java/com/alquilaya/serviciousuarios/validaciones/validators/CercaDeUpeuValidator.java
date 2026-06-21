package com.alquilaya.serviciousuarios.validaciones.validators;

import com.alquilaya.serviciousuarios.clients.CampusProvider;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.CercaDeUpeu;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.factory.annotation.Autowired;

import java.lang.reflect.Method;

public class CercaDeUpeuValidator implements ConstraintValidator<CercaDeUpeu, Object> {

    // Respaldo si el validador se instancia fuera del contexto Spring (sin inyección).
    private static final double FALLBACK_LAT = -11.99024;
    private static final double FALLBACK_LON = -76.83992;

    @Autowired(required = false)
    private CampusProvider campusProvider;

    private double radioKmAnotacion;

    @Override
    public void initialize(CercaDeUpeu constraintAnnotation) {
        this.radioKmAnotacion = constraintAnnotation.radioKm();
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext ctx) {
        if (value == null) return true;

        try {
            Method getLat = value.getClass().getMethod("getLatitud");
            Method getLon = value.getClass().getMethod("getLongitud");

            Double lat = (Double) getLat.invoke(value);
            Double lon = (Double) getLon.invoke(value);

            if (lat == null || lon == null) return true;

            double campusLat = FALLBACK_LAT;
            double campusLon = FALLBACK_LON;
            double radioKm = radioKmAnotacion;
            if (campusProvider != null) {
                CampusProvider.Campus campus = campusProvider.get();
                campusLat = campus.lat();
                campusLon = campus.lng();
                radioKm = campus.radioKm();
            }

            double distancia = calcularDistancia(lat, lon, campusLat, campusLon);

            if (distancia > radioKm) {
                ctx.disableDefaultConstraintViolation();
                ctx.buildConstraintViolationWithTemplate(
                    String.format("La ubicación registrada (%.2f km) excede el radio de %.1f km permitido desde el campus",
                    distancia, radioKm)
                ).addConstraintViolation();
                return false;
            }
            return true;
        } catch (Exception e) {
            // Si no tiene los métodos, no podemos validar por distancia
            return true;
        }
    }

    private double calcularDistancia(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // Radio de la Tierra en km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
