package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.DocumentoAdminDTO;
import com.alquilaya.serviciousuarios.dto.TipoDocumentoConfigDTO;
import com.alquilaya.serviciousuarios.dto.VerificarDocumentoRequest;
import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.TipoDocumento;
import com.alquilaya.serviciousuarios.services.DocumentoService;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.ArchivoValido;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    @GetMapping("/tipos-requeridos")
    public ResponseEntity<List<TipoDocumentoConfigDTO>> getTiposRequeridos() {
        return ResponseEntity.ok(TipoDocumento.requeridos().stream()
                .map(t -> new TipoDocumentoConfigDTO(t.name(), t.getTitulo(), t.getDescripcion()))
                .toList());
    }

    // Anti-IDOR: solo puedes subir documentos a TU propia cuenta (el usuarioId debe ser el del token).
    @PostMapping("/upload")
    @PreAuthorize("@permisoEnforcer.esPropioUsuario(#usuarioId)")
    public ResponseEntity<DocumentoVerificacion> uploadDocumento(
            @RequestParam("usuarioId") Long usuarioId,
            @RequestParam("tipo") TipoDocumento tipo,
            @RequestParam("archivo") @ArchivoValido MultipartFile archivo) {

        return ResponseEntity.ok(documentoService.subirDocumento(usuarioId, tipo, archivo));
    }

    // Anti-IDOR: solo puedes verificar el DNI de TU propia cuenta (escribe usuario.dni + auto-aprueba).
    @PostMapping("/verificar-dni-instantaneo")
    @PreAuthorize("@permisoEnforcer.esPropioUsuario(#usuarioId)")
    public ResponseEntity<Usuario> verificarDniInstantaneo(
            @RequestParam("usuarioId") Long usuarioId,
            @RequestParam("dni") String dni) {

        return ResponseEntity.ok(documentoService.verificarDniInstantaneo(usuarioId, dni));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<DocumentoVerificacion> getDocumento(@PathVariable Long id) {
        return ResponseEntity.ok(documentoService.obtenerPorId(id));
    }

    // Anti-IDOR: solo tus propios documentos (DNI/identidad son PII), salvo que seas admin con VER_USUARIOS.
    @GetMapping("/usuario/{usuarioId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS') or @permisoEnforcer.esPropioUsuario(#usuarioId)")
    public ResponseEntity<List<DocumentoVerificacion>> getDocumentosUsuario(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(documentoService.obtenerDocumentosUsuario(usuarioId));
    }

    @GetMapping("/admin/pending")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_DOCUMENTOS')")
    public ResponseEntity<List<DocumentoAdminDTO>> getPendingDocuments() {
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
