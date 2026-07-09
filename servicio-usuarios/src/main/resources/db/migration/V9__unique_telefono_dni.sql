-- U2: unicidad de teléfono y DNI a nivel de BD (cierra la carrera TOCTOU del registro y
-- el NonUniqueResultException que reventaba la verificación de OTP por teléfono).
--
-- Se usan índices ÚNICOS PARCIALES (no un UNIQUE plano) a propósito:
--   * telefono: puede ser NULL (usuarios de Google sin teléfono) → se excluyen los NULL.
--   * dni: los usuarios de Google usan el placeholder '00000000' (varios lo comparten)
--          → se excluye el placeholder además de los NULL.
-- Un UNIQUE plano rompería el segundo registro con Google. En una BD nueva de prod no hay
-- duplicados; la app ya valida en registrarUsuario (existsByTelefono/existsByDni) y este
-- índice sólo cierra la ventana de carrera entre dos registros simultáneos.

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_telefono
    ON usuarios (telefono)
    WHERE telefono IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_dni
    ON usuarios (dni)
    WHERE dni IS NOT NULL AND dni <> '00000000';
