CREATE TABLE IF NOT EXISTS "SphaerAI_contratos" (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(150),
  datos          TEXT,       
  codigo_sic     VARCHAR(50),
  anio           INTEGER,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sphaerai_contratos_nombre ON "SphaerAI_contratos" (nombre);
CREATE INDEX IF NOT EXISTS idx_sphaerai_contratos_codigo_sic ON "SphaerAI_contratos" (codigo_sic);
CREATE INDEX IF NOT EXISTS idx_sphaerai_contratos_anio ON "SphaerAI_contratos" (anio);

CREATE TABLE IF NOT EXISTS "SphaerAI_porcentaje_cubrimiento" (
  id             SERIAL PRIMARY KEY,
  anio           INTEGER,
  mes            INTEGER,
  valor          INTEGER,     
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sphaerai_porc_cubrimiento_anio ON "SphaerAI_porcentaje_cubrimiento" (anio);