/**
 * Límite de fotos de UNA PROPIEDAD (portada + galería), compartido entre el wizard de alta
 * (`landlord/properties/add`), la página de edición (`landlord/properties/[id]/edit`) y el
 * modal de edición rápida (`components/landlord/edit-property-modal.tsx`) — ítem 333 de
 * MEJORAS.md: antes había dos constantes independientes (`MAX_FOTOS` en el modal y
 * `MAX_IMAGES` en `property-form-types.ts`), ambas en 6. Se unifican aquí en una sola fuente.
 *
 * No confundir con el límite de fotos POR HABITACIÓN (`MAX_ROOM_IMAGES` en
 * `components/landlord/room-manager.tsx`, ítem 334, ya implementado con su propio tope de 8).
 */
export const MAX_PROPERTY_IMAGES = 12;
