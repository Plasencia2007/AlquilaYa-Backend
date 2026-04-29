package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.dto.DashboardArrendadorDTO;

public interface DashboardService {
    DashboardArrendadorDTO obtenerMetricasArrendador(Long arrendadorId);
}
