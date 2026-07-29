/**
 * Página de Spring Data (`org.springframework.data.domain.Page`) serializada a
 * JSON. Tipo compartido para no duplicar el shape del `Page` en cada service.
 *
 * Los 5 campos "core" (content, totalElements, totalPages, number, size) siempre
 * vienen en la respuesta y son los que la mayoría de consumidores usan. Los flags
 * extra (first / last / numberOfElements / empty) también los envía Spring, pero
 * se declaran opcionales para poder construir páginas "sintéticas" (p.ej. al
 * normalizar un array plano a una sola página) sin repetir todos los campos.
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  empty?: boolean;
}
