/**
 * Ítem 255: extrae el id de la primera URL de propiedad (`/property/{id}`) que
 * aparezca en un texto de chat, para renderizarla como mini-card en vez de un
 * link plano. Solo detección — no valida que la propiedad exista (eso lo
 * resuelve `PropertyShareCard` al hacer el fetch).
 */
export function extraerPropiedadCompartida(texto: string): string | null {
  const match = texto.match(/\/property\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
