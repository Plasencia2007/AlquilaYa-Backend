package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.VerificarDocumentoRequest;
import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;
import com.alquilaya.serviciousuarios.enums.TipoDocumento;
import com.alquilaya.serviciousuarios.services.DocumentoService;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.ArchivoValido;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/usuarios/documentos")
@RequiredArgsConstructor
@Validated
public class DocumentoController {

    private final DocumentoService documentoService;

    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DocumentoVerificacion> uploadDocumento(
            @RequestParam("usuarioId") Long usuarioId,
            @RequestParam("tipo") TipoDocumento tipo,
            @RequestParam("archivo") @ArchivoValido MultipartFile archivo) {
        
        return ResponseEntity.ok(documentoService.subirDocumento(usuarioId, tipo, archivo));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<DocumentoVerificacion> getDocumento(@PathVariable Long id) {
        return ResponseEntity.ok(documentoService.obtenerPorId(id));
    }

    @GetMapping("/usuario/{usuarioId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DocumentoVerificacion>> getDocumentosUsuario(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(documentoService.obtenerDocumentosUsuario(usuarioId));
    }

    @GetMapping("/admin/pending")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_DOCUMENTOS')")
    public ResponseEntity<List<DocumentoVerificacion>> getPendingDocuments() {
        return ResponseEntity.ok(documentoService.listarPendientes());
    }

    @PatchMapping("/admin/verify/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_DOCUMENTOS')")
    public ResponseEntity<DocumentoVerificacion> verifyDocumento(
            @PathVariable Long id,
            @Valid @RequestBody VerificarDocumentoRequest request) {
        
        return ResponseEntity.ok(documentoService.verificarDocumento(id, request.getEstado(), request.getComentario()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_DOCUMENTOS')")
    public ResponseEntity<Void> eliminarDocumento(@PathVariable Long id) {
        documentoService.eliminarDocumento(id);
        return ResponseEntity.noContent().build();
    }
}
