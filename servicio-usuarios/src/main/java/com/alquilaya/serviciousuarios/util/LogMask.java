package com.alquilaya.serviciousuarios.util;

/**
 * Enmascaramiento de datos personales para logs (PII-safe).
 * Los logs de nivel WARN/ERROR relacionados a seguridad pueden preservar info completa;
 * para INFO/DEBUG rutinarios usar siempre estas funciones.
 */
public final class LogMask {

    private LogMask() {}

    /** "+51987654321" → "+51***4321". Mantiene últimos 4 dígitos. */
    public static String phone(String phone) {
        if (phone == null) return "null";
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() <= 4) return "***";
        return "***" + digits.substring(digits.length() - 4);
    }

    /** "juan.perez@upeu.edu.pe" → "j***z@upeu.edu.pe". Preserva dominio. */
    public static String email(String email) {
        if (email == null) return "null";
        int at = email.indexOf('@');
        if (at < 0) return "***";
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) return "***" + domain;
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + domain;
    }
}
