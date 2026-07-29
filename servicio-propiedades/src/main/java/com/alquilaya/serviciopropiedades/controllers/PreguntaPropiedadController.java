package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.CrearPreguntaRequest;
import com.alquilaya.serviciopropiedades.dto.PreguntaPropiedadResponseDTO;
import com.alquilaya.serviciopropiedades.entities.PreguntaPropiedad;
import com.alquilaya.serviciopropiedades.services.PreguntaPropiedadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Q&A pública por propiedad (ítem 166). GET es público; crear pregunta y responder requieren rol. */
@RestController
@RequestMapping("/api/v1/propiedades/{propiedadId}/preguntas")
@RequiredArgsConstructor
public class PreguntaPropiedadController {

    private final PreguntaPropiedadService preguntaService;

    @GetMapping
    public ResponseEntity<List<PreguntaPropiedadResponseDTO>> listar(@PathVariable Long propiedadId) {
        return ResponseEntity.ok(preguntaService.listarPorPropiedad(propiedadId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ESTUDIANTE')")
    public ResponseEntity<PreguntaPropiedad> crear(
            @PathVariable Long propiedadId,
            @Valid @RequestBody CrearPreguntaRequest req) {
        Long estudianteId = CurrentUserProvider.requirePerfilId();
        return ResponseEntity.ok(preguntaService.crearPregunta(propiedadId, estudianteId, req.getPregunta()));
    }

    @PutMapping("/{preguntaId}/respuesta")
    @PreAuthorize("hasRole('ARRENDADOR')")
    public ResponseEntity<PreguntaPropiedadResponseDTO> responder(
            @PathVariable Long propiedadId,
            @PathVariable Long preguntaId,
            @RequestBody Map<String, String> body) {
        Long arrendadorId = CurrentUserProvider.requirePerfilId();
        String respuesta = body != null ? body.get("respuesta") : null;
        return ResponseEntity.ok(preguntaService.responder(preguntaId, arrendadorId, respuesta));
    }
}
