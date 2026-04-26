package com.alquilaya.serviciousuarios.config;

import com.alquilaya.serviciousuarios.entities.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Value("${password-reset.token-expiration-ms:900000}")
    private long resetExpiration;

    public String generateToken(Usuario usuario, Long perfilId) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("userId", usuario.getId());
        if (perfilId != null) {
            extraClaims.put("perfilId", perfilId);
        }
        extraClaims.put("rol", usuario.getRol().name());
        extraClaims.put("nombre", usuario.getNombre());
        return generateToken(extraClaims, usuario.getCorreo());
    }

    public String generateToken(Map<String, Object> extraClaims, String subject) {
        return Jwts
                .builder()
                .setClaims(extraClaims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Token corto (15min default) firmado para reset de password.
     * Incluye claim {@code type=password_reset} para validar el propósito y
     * evitar reutilizar tokens de auth en este flow.
     */
    public String generatePasswordResetToken(String correo) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "password_reset");
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(correo)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + resetExpiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Valida un token de reset y devuelve el correo (subject) si es válido.
     * Lanza si el token expiró, está malformado o no tiene type=password_reset.
     */
    public String validatePasswordResetToken(String token) {
        Claims claims = extractAllClaims(token);
        Object type = claims.get("type");
        if (!"password_reset".equals(type)) {
            throw new IllegalArgumentException("Tipo de token inválido");
        }
        if (claims.getExpiration().before(new Date())) {
            throw new IllegalArgumentException("El enlace ha expirado");
        }
        return claims.getSubject();
    }

    public boolean isTokenValid(String token, String correo) {
        final String userEmail = extractUsername(token);
        return (userEmail.equals(correo)) && !isTokenExpired(token);
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
