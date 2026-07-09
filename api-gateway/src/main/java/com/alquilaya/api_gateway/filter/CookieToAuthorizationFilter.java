package com.alquilaya.api_gateway.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;

/**
 * S5: el access token del frontend vive en un cookie httpOnly (JS no puede leerlo, así que
 * no puede armar el header {@code Authorization: Bearer <token>} él mismo). Este filtro
 * "traduce" el cookie a ese header ANTES de que la petición llegue a cualquier interceptor
 * o al enrutamiento del gateway hacia los servicios de dominio — así ningún servicio
 * downstream (ni {@link JwtRevocationInterceptor}, ni Feign entre servicios) necesita saber
 * que el origen fue un cookie: siguen viendo exactamente el mismo header de siempre.
 *
 * <p>Es un {@code Filter} genuino (no un {@code HandlerInterceptor}) para correr ANTES de
 * todo — los Filters envuelven todo el despacho de Spring MVC, los interceptors corren
 * después, dentro del DispatcherServlet.
 *
 * <p>Si la petición YA trae un header {@code Authorization} explícito (clientes no-browser,
 * o el WS que arma el suyo propio), NO se toca — el cookie es sólo un fallback.</p>
 */
@Component
@Order(Integer.MIN_VALUE) // lo primero de todo, antes que cualquier otro filtro/interceptor
public class CookieToAuthorizationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(CookieToAuthorizationFilter.class);
    private static final String COOKIE_NAME = "auth-token";

    @Override
    protected void doFilterInternal(HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (request.getHeader("Authorization") == null) {
            String token = leerCookie(request, COOKIE_NAME);
            if (token != null && !token.isBlank()) {
                chain.doFilter(new AuthorizationHeaderRequestWrapper(request, "Bearer " + token), response);
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private static String leerCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (name.equals(c.getName())) return c.getValue();
        }
        return null;
    }

    /** Envuelve el request para que {@code getHeader("Authorization")} devuelva el valor derivado del cookie. */
    private static class AuthorizationHeaderRequestWrapper extends HttpServletRequestWrapper {
        private final String authorizationValue;

        AuthorizationHeaderRequestWrapper(HttpServletRequest request, String authorizationValue) {
            super(request);
            this.authorizationValue = authorizationValue;
        }

        @Override
        public String getHeader(String name) {
            if ("Authorization".equalsIgnoreCase(name)) return authorizationValue;
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if ("Authorization".equalsIgnoreCase(name)) {
                return Collections.enumeration(Collections.singletonList(authorizationValue));
            }
            return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            java.util.List<String> names = Collections.list(super.getHeaderNames());
            if (!names.contains("Authorization") && !names.contains("authorization")) {
                names.add("Authorization");
            }
            return Collections.enumeration(names);
        }
    }
}
