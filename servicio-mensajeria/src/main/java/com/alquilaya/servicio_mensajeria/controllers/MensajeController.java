package com.alquilaya.servicio_mensajeria.controllers;

import com.alquilaya.servicio_mensajeria.config.CurrentUserProvider;
import com.alquilaya.servicio_mensajeria.dto.CrearMensajeRequest;
import com.alquilaya.servicio_mensajeria.dto.MensajeDTO;
import com.alquilaya.servicio_mensajeria.services.CloudinaryService;
import com.alquilaya.servicio_mensajeria.services.ConversacionService;
import com.alquilaya.servicio_mensajeria.services.MensajeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mensajeria/conversaciones/{id}")
@RequiredArgsConstructor
public class MensajeController {

    private final MensajeService mensajeService;
    // Ítem 254: el endpoint de subida de adjuntos valida acceso directamente (no vía
    // MensajeService) porque es un paso previo e independiente a crear el mensaje —
    // el frontend primero sube la imagen aquí, y recién después llama a POST /mensajes
    // con {tipo:'IMAGEN', urlAdjunto}.
    private final ConversacionService conversacionService;
    private final CloudinaryService cloudinaryService;

    @GetMapping("/mensajes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<MensajeDTO>> listar(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
        return ResponseEntity.ok(mensajeService.listarVisibles(id, CurrentUserProvider.get(), pageable));
    }

    @PostMapping("/mensajes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MensajeDTO> enviar(@PathVariable Long id, @Valid @RequestBody CrearMensajeRequest req) {
        MensajeDTO dto = mensajeService.enviar(id, req, CurrentUserProvider.get());
        return ResponseEntity.status(201).body(dto);
    }

    @PatchMapping("/marcar-leida")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> marcarLeida(@PathVariable Long id) {
        mensajeService.marcarLeidos(id, CurrentUserProvider.get());
        return ResponseEntity.noContent().build();
    }

    /**
     * Ítem 254: sube una imagen de chat a Cloudinary y devuelve su URL — NO crea el
     * mensaje. Flujo del frontend: 1) POST aquí -> { url }; 2) POST /mensajes con
     * { tipo: 'IMAGEN', urlAdjunto: url }. Separado en dos pasos para que la UI pueda
     * mostrar progreso de subida antes de confirmar el envío del mensaje.
     */
    @PostMapping(value = "/adjuntos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> subirAdjunto(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        conversacionService.verificarAcceso(id, CurrentUserProvider.get());
        String url = cloudinaryService.subirAdjuntoChat(file, id);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
