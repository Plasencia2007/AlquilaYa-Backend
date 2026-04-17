package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final ArrendadorRepository arrendadorRepository;
    private final EstudianteRepository estudianteRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Usuario registrarUsuario(Usuario usuario) {
        if (usuarioRepository.existsByCorreo(usuario.getCorreo())) {
            throw new RuntimeException("El correo ya está registrado");
        }
        usuario.setPassword(passwordEncoder.encode(usuario.getPassword()));
        Usuario savedUser = usuarioRepository.save(usuario);

        // Crear perfil automáticamente según el rol
        if (savedUser.getRol() == Rol.ARRENDADOR) {
            arrendadorRepository.save(Arrendador.builder()
                    .usuario(savedUser)
                    .nombreComercial("Mi Negocio") // Valores por defecto
                    .build());
        } else if (savedUser.getRol() == Rol.ESTUDIANTE) {
            estudianteRepository.save(Estudiante.builder()
                    .usuario(savedUser)
                    .universidad("Por definir")
                    .build());
        }

        return savedUser;
    }

    public Optional<Usuario> buscarPorCorreo(String correo) {
        return usuarioRepository.findByCorreo(correo);
    }

    public boolean verificarPassword(String passwordPlana, String passwordHashed) {
        return passwordEncoder.matches(passwordPlana, passwordHashed);
    }
}
