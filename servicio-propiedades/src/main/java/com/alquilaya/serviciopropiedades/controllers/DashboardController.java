package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.DashboardArrendadorDTO;
import com.alquilaya.serviciopropiedades.services.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/arrendador")
    @PreAuthorize("hasRole('ARRENDADOR')")
    public ResponseEntity<DashboardArrendadorDTO> obtenerDashboardArrendador() {
        Long arrendadorId = CurrentUserProvider.requirePerfilId();
        return ResponseEntity.ok(dashboardService.obtenerMetricasArrendador(arrendadorId));
    }
}
