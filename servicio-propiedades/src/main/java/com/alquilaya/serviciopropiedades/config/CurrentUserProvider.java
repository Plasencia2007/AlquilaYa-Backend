package com.alquilaya.serviciopropiedades.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUserProvider {

    private CurrentUserProvider() {}

    public static CurrentUser get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof CurrentUser current) {
            return current;
        }
        return null;
    }

    public static Long requirePerfilId() {
        CurrentUser cu = get();
        if (cu == null || cu.getPerfilId() == null) {
            throw new IllegalStateException("No hay perfilId en el contexto de seguridad. El usuario no tiene perfil asociado.");
        }
        return cu.getPerfilId();
    }

    public static Long requireUserId() {
        CurrentUser cu = get();
        if (cu == null || cu.getUserId() == null) {
            throw new IllegalStateException("No hay userId en el contexto de seguridad.");
        }
        return cu.getUserId();
    }

    public static String requireRol() {
        CurrentUser cu = get();
        if (cu == null || cu.getRol() == null) {
            throw new IllegalStateException("No hay rol en el contexto de seguridad.");
        }
        return cu.getRol();
    }
}
