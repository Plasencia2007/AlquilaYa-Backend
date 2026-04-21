package com.alquilaya.serviciousuarios.validaciones.validators;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.CercaDeUpeu;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.lang.reflect.Method;

public class CercaDeUpeuValidator implements ConstraintValidator<CercaDeUpeu, Object> {

    // Coordenadas aproximadas de UPeU Campus Lima (Ñaña)
    private static final double UPEU_LAT = -11.9922;
    private static final double UPEU_LON = -76.8403;
    private double radioKm;

    @Override
    public void initialize(CercaDeUpeu constraintAnnotation) {
        this.radioKm = constraintAnnotation.radioKm();
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

            double distancia = calcularDistancia(lat, lon, UPEU_LAT, UPEU_LON);
            
            if (distancia > radioKm) {
                ctx.disableDefaultConstraintViolation();
                ctx.buildConstraintViolationWithTemplate(
                    String.format("La ubicación registrada (%.2f km) excede el radio de %.1f km permitido desde la UPeU", 
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
