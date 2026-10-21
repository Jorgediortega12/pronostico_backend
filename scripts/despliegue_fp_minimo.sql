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

-- Método de corrección de los periodos de FP que quedan bajo el mínimo (feat/factores-fp-correccion). Uno por mercado.
--   piso    -> se sube al mínimo (por defecto, comportamiento original)
--   vecinos -> promedio de los 2 periodos sanos más cercanos del mismo día
--   copiar  -> se copia de otro tipo de día de la misma barra donde el periodo está sano (si no hay, vecinos)
-- Si el mercado no tiene fila se usa 'piso'. También se puede elegir desde el botón "FP mínimo" de Factores.
CREATE TABLE IF NOT EXISTS factores_fp_metodo (
  mc VARCHAR(100) PRIMARY KEY,
  metodo VARCHAR(20) NOT NULL DEFAULT 'piso',
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Opcional: dejar Antioquia en "copiar de otro tipo de día".
-- INSERT INTO factores_fp_metodo (mc, metodo) VALUES ('Antioquia', 'copiar')
-- ON CONFLICT (mc) DO UPDATE SET metodo = EXCLUDED.metodo, actualizado_en = NOW();

-- Ajuste automático de curvas típicas para acercar el FP al mínimo (solo con el método 'piso'). Por mercado.
-- true -> al calcular, se cambian algunos días de la selección por otros días típicos reales que suban el FP.
ALTER TABLE factores_fp_metodo ADD COLUMN IF NOT EXISTS ajustar_curvas BOOLEAN NOT NULL DEFAULT FALSE;

-- Opcional: activarlo para Antioquia.
-- INSERT INTO factores_fp_metodo (mc, ajustar_curvas) VALUES ('Antioquia', true)
-- ON CONFLICT (mc) DO UPDATE SET ajustar_curvas = EXCLUDED.ajustar_curvas, actualizado_en = NOW();
