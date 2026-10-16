-- FP mínimo en Factores (feat/factores-fp-minimo). Ejecutar en la BD de CADA empresa.
-- Es idempotente. El backend también crea la tabla sola la primera vez que se consulta o guarda el FP mínimo.
--
-- Una fila por (mc, barra). barra = '' es el mínimo general del mercado; barra = 'NOMBRE' es el mínimo propio de esa barra.
CREATE TABLE IF NOT EXISTS factores_fp_minimo (
  mc VARCHAR(100) NOT NULL,
  barra VARCHAR(100) NOT NULL DEFAULT '',
  minimo NUMERIC(6,5) NOT NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (mc, barra)
);

-- Opcional: dejar el mínimo general de Antioquia en 0.86 (el FP calculado no baja de ese valor).
-- INSERT INTO factores_fp_minimo (mc, barra, minimo) VALUES ('Antioquia', '', 0.86)
-- ON CONFLICT (mc, barra) DO UPDATE SET minimo = EXCLUDED.minimo, actualizado_en = NOW();
