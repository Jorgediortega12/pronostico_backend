-- Descargas: fecha y usuario de cada reporte (feat/reportes-metadatos-dna-grafica). Ejecutar en la BD de CADA empresa.
-- Es idempotente. El backend también crea las columnas solo la primera vez que se guarda o lista un reporte.
--
-- Cada vez que se (re)genera un reporte se inserta una fila en archivos con creado_en / creado_por:
-- la primera fila de un mismo archivo es la "generación" y la última la "modificación".
-- Los archivos anteriores a este cambio quedan con NULL y se muestran con "—".
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP;
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS creado_por VARCHAR(150);
