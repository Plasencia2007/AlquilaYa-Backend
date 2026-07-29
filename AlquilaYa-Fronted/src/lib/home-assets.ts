/**
 * Imágenes del home público `(public)/page.tsx`.
 *
 * PLACEHOLDER: son fotos de stock de Unsplash, no fotos reales de propiedades AlquilaYa.
 * Pendiente (MEJORAS.md #76): reemplazar por fotos propias servidas desde Cloudinary
 * (`f_auto,q_auto`), idealmente administrables desde el catálogo `BANNER` de
 * servicio-catalogos. Ese catálogo hoy solo expone texto + link de redirección
 * (`ItemCatalogo` no tiene campo de imagen) — cablear el hero a él requeriría primero
 * un cambio de backend, fuera de alcance de este ítem.
 */
export const HOME_HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop';

/**
 * Blur placeholder de la imagen del hero (MEJORAS.md #92).
 *
 * La foto es un placeholder remoto de Unsplash (no un asset propio de Cloudinary),
 * así que no podemos derivar el LQIP real de la imagen en build. En su lugar usamos
 * un PNG sólido diminuto de 10x6 px (~74 bytes) en un marrón cálido y oscuro (#3d2c1f),
 * acorde al tono de la habitación con luz cálida + la capa `brightness-75` y los
 * gradientes oscuros que van encima. Es honesto (no finge detalle que no existe) y
 * funcional: evita el "flash" en blanco mientras carga la imagen above-the-fold.
 *
 * Cuando #76 migre el hero a Cloudinary, reemplazar por el blurDataURL real
 * (Cloudinary `e_blur`, o `next/image` lo autogenera para imports estáticos).
 */
export const HOME_HERO_BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAIAAAB1kpiRAAAAEUlEQVR42mOw1ZHHgxgGrzQAnMcf4aiqrcIAAAAASUVORK5CYII=';

export const HOME_CTA_BANNER_IMAGE_URL =
  'https://images.unsplash.com/photo-1557053910-d9eadeed1c58?q=80&w=1974&auto=format&fit=crop';
