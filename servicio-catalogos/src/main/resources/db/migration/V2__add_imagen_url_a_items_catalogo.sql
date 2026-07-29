-- Agrega el campo de imagen (Cloudinary) a items_catalogo, usado por los ítems
-- tipo BANNER para gestionar el hero/CTA del home desde el catálogo en vez de
-- URLs hardcodeadas en el frontend.
ALTER TABLE `items_catalogo`
  ADD COLUMN `imagen_url` varchar(500) DEFAULT NULL AFTER `icono`;
