-- Script para insertar permisos necesarios para CRUD completo
-- Roles: 'ADMIN', 'ESTUDIANTE', 'ARRENDADOR'

INSERT INTO permisos (rol, funcionalidad, habilitado)
VALUES 
-- Gestión de Usuarios (Admin)
('ADMIN', 'VER_USUARIOS', true),
('ADMIN', 'EDITAR_USUARIO', true),
('ADMIN', 'ELIMINAR_USUARIO', true),
('ADMIN', 'GESTIONAR_SISTEMA', true),

-- Gestión de Propiedades y otros (Admin/Arrendador)
('ADMIN', 'VER_CUARTOS', true),
('ADMIN', 'PUBLICAR_CUARTOS', true),
('ADMIN', 'GESTIONAR_RESERVAS', true),
('ADMIN', 'MODERAR_RESENAS', true),
('ADMIN', 'GESTIONAR_DOCUMENTOS', true),

('ARRENDADOR', 'VER_CUARTOS', true),
('ARRENDADOR', 'PUBLICAR_CUARTOS', true),
('ARRENDADOR', 'GESTIONAR_RESERVAS', true),

('ESTUDIANTE', 'VER_CUARTOS', true),
('ESTUDIANTE', 'RESERVAR', true),
('ESTUDIANTE', 'AGREGAR_FAVORITOS', true),
('ESTUDIANTE', 'RESENAR', true)

ON CONFLICT ON CONSTRAINT uk_permiso_rol_funcionalidad DO UPDATE 
SET habilitado = EXCLUDED.habilitado;
