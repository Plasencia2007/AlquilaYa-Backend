/**
 * URL-builder de transformaciones Cloudinary (ítem 420 de MEJORAS.md).
 *
 * OJO: lo que este proyecto guarda en BD (`PropiedadImagen.url`, `Propiedad.imagenes[]`)
 * es la URL COMPLETA que devuelve `secure_url` del SDK de Cloudinary al subir, no un
 * `public_id` suelto — ver `servicio-propiedades/.../services/CloudinaryService.java`
 * (`uploadImagenCuarto`). Formato real confirmado ahí:
 *
 *   https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder...}/img-{n}.{ext}
 *
 * p.ej. https://res.cloudinary.com/alquilaya/image/upload/v1719000000/alquilaya/arrendadores/12-juan-perez/cuarto-45/img-0.jpg
 *
 * Cloudinary permite insertar transformaciones como un segmento extra justo
 * después de `/upload/` (y antes del segmento de versión `v.../`), p.ej.:
 *
 *   .../upload/f_auto,q_auto,w_400/v1719000000/.../img-0.jpg
 *
 * Esta función localiza ese punto de inserción en la URL ya guardada y mete ahí
 * las transformaciones pedidas. Si la URL no es de Cloudinary (imagen externa
 * pegada por el arrendador — ver `esImagenExterna` en `@/lib/img`) no hay nada
 * que transformar: se devuelve tal cual.
 */

const CLOUDINARY_HOST = 'res.cloudinary.com';
const UPLOAD_MARKER = '/upload/';

export interface ImgUrlOptions {
  /** Ancho destino (px). Agrega `c_fill,w_{w}`. */
  w?: number;
  /** Alto destino (px). Agrega `h_{h}`. */
  h?: number;
  /**
   * true = variante minúscula y borrosa para usar como `blurDataURL` de
   * next/image (`placeholder="blur"`, ítem 419). Agrega `e_blur:1000,q_1,w_50`.
   */
  blur?: boolean;
}

/**
 * Inyecta transformaciones Cloudinary (`f_auto,q_auto` siempre + las opcionales)
 * en una URL completa ya guardada en BD. No modifica URLs externas (no-Cloudinary).
 */
export function imgUrl(publicIdOrUrl: string, opts: ImgUrlOptions = {}): string {
  if (!publicIdOrUrl) return publicIdOrUrl;
  if (!publicIdOrUrl.includes(CLOUDINARY_HOST)) return publicIdOrUrl;

  const idx = publicIdOrUrl.indexOf(UPLOAD_MARKER);
  if (idx < 0) return publicIdOrUrl;

  const transforms = ['f_auto', 'q_auto'];
  if (opts.w) transforms.push('c_fill', `w_${opts.w}`);
  if (opts.h) transforms.push(`h_${opts.h}`);
  if (opts.blur) transforms.push('e_blur:1000', 'q_1', 'w_50');

  const insertAt = idx + UPLOAD_MARKER.length;
  return (
    publicIdOrUrl.slice(0, insertAt) +
    transforms.join(',') +
    '/' +
    publicIdOrUrl.slice(insertAt)
  );
}
