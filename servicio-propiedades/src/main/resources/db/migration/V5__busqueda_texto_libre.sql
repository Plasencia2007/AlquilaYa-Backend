-- Full-text search real (ítem 491): tsvector generado + índice GIN sobre
-- título+descripción+dirección. Reemplaza el LIKE/ILIKE pragmático del ítem 126
-- (que hacía full scan) por matching con stemming en español, acelerado por índice.
-- to_tsvector(regconfig_literal, text) es IMMUTABLE cuando el config es un literal
-- (no una columna), así que es válido en una columna GENERATED.
ALTER TABLE propiedades
  ADD COLUMN busqueda_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('spanish',
      coalesce(titulo, '') || ' ' || coalesce(descripcion, '') || ' ' || coalesce(direccion, '')
    )
  ) STORED;

CREATE INDEX idx_propiedades_busqueda_tsv ON propiedades USING GIN (busqueda_tsv);
