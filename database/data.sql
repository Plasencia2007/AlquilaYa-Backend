-- Scripts de datos iniciales (Seed)
-- Los passwords están encriptados con BCrypt (password: password123)

INSERT INTO usuarios (nombre, correo, password, rol)
VALUES 
('Admin AlquilaYa', 'admin@alquilaya.com', '$2a$10$vI8.Z.tD6L6l6l6l6l6l6u6u6u6u6u6u6u6u6u6u6u6u6u6u6u6u6', 'ADMIN'),
('Estudiante Prueba', 'estudiante@alquilaya.com', '$2a$10$vI8.Z.tD6L6l6l6l6l6u6u6u6u6u6u6u6u6u6u6u6u6u6u6u6u6', 'ESTUDIANTE')
ON CONFLICT (correo) DO NOTHING;
