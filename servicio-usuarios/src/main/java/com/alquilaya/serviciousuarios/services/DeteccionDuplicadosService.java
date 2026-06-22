package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.ClusterDuplicadoDTO;
import com.alquilaya.serviciousuarios.dto.ClusterDuplicadoDTO.CuentaDuplicadaDTO;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Detección de cuentas duplicadas (#8): agrupa cuentas que comparten un dato fuerte —
 * DNI, teléfono o email canónico (normalizando trucos de Gmail: puntos y +etiquetas).
 * Solo lee la BD (gratis); el admin decide qué hacer con cada grupo.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeteccionDuplicadosService {

    /** DNI placeholder de las cuentas creadas por Google → no es duplicado real. */
    private static final String DNI_PLACEHOLDER = "00000000";

    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<ClusterDuplicadoDTO> detectar() {
        List<ClusterDuplicadoDTO> clusters = new ArrayList<>();

        // 1) Mismo DNI (señal más fuerte: una persona tiene un solo DNI)
        for (String dni : usuarioRepository.dnisDuplicados(DNI_PLACEHOLDER)) {
            clusters.add(cluster("DNI", dni, usuarioRepository.findAllByDni(dni)));
        }

        // 2) Mismo teléfono (duplicados legacy anteriores a la validación)
        for (String tel : usuarioRepository.telefonosDuplicados()) {
            clusters.add(cluster("TELEFONO", tel, usuarioRepository.findAllByTelefono(tel)));
        }

        // 3) Mismo email canónico (alias de Gmail que esquivan el unique de correo)
        Map<String, List<Usuario>> porCanonico = new LinkedHashMap<>();
        for (Usuario u : usuarioRepository.findAll()) {
            if (u.getCorreo() == null) continue;
            porCanonico.computeIfAbsent(canonicalizarEmail(u.getCorreo()), k -> new ArrayList<>()).add(u);
        }
        porCanonico.forEach((canonico, lista) -> {
            if (lista.size() > 1) clusters.add(cluster("EMAIL", canonico, lista));
        });

        log.info("[DUPLICADOS] {} grupo(s) detectado(s)", clusters.size());
        return clusters;
    }

    private ClusterDuplicadoDTO cluster(String criterio, String valor, List<Usuario> usuarios) {
        return new ClusterDuplicadoDTO(criterio, valor, usuarios.stream().map(CuentaDuplicadaDTO::de).toList());
    }

    /**
     * Normaliza el correo para detectar alias del mismo buzón. Para Gmail/Googlemail:
     * elimina los puntos del usuario y todo lo que siga a un '+'. Otros dominios: solo minúsculas.
     */
    static String canonicalizarEmail(String correo) {
        String c = correo.trim().toLowerCase();
        int at = c.indexOf('@');
        if (at <= 0) return c;
        String local = c.substring(0, at);
        String dominio = c.substring(at + 1);
        if (dominio.equals("gmail.com") || dominio.equals("googlemail.com")) {
            int mas = local.indexOf('+');
            if (mas >= 0) local = local.substring(0, mas);
            local = local.replace(".", "");
            dominio = "gmail.com";
        }
        return local + "@" + dominio;
    }
}
