package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;
import com.alquilaya.serviciousuarios.enums.EstadoVerificacion;
import com.alquilaya.serviciousuarios.enums.TipoDocumento;
import com.alquilaya.serviciousuarios.services.DocumentoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/usuarios/documentos")
@RequiredArgsConstructor
public class DocumentoController {

    private final DocumentoService documentoService;

    @PostMapping("/upload")
    public ResponseEntity<DocumentoVerificacion> uploadDocumento(
            @RequestParam("usuarioId") Long usuarioId,
            @RequestParam("tipo") TipoDocumento tipo,
            @RequestParam("archivo") MultipartFile archivo) {
        
        return ResponseEntity.ok(documentoService.subirDocumento(usuarioId, tipo, archivo));
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<DocumentoVerificacion>> getDocumentosUsuario(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(documentoService.obtenerDocumentosUsuario(usuarioId));
    }

    @GetMapping("/admin/pending")
    public ResponseEntity<List<DocumentoVerificacion>> getPendingDocuments() {
        return ResponseEntity.ok(documentoService.listarPendientes());
    }

    @PatchMapping("/admin/verify/{id}")
    public ResponseEntity<DocumentoVerificacion> verifyDocumento(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        
        EstadoVerificacion estado = EstadoVerificacion.valueOf((String) request.get("estado"));
        String comentario = (String) request.get("comentario");
        
        return ResponseEntity.ok(documentoService.verificarDocumento(id, estado, comentario));
    }
}
