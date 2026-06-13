// ─── Contratos ───────────────────────────────────────────────────────────────
export const getContratoById = `
  SELECT id, nombre, datos, codigo_sic, anio, fecha_creacion
  FROM "SphaerAI_contratos"
  WHERE id = $1
`;

export const getContratosByAnio = `
  SELECT id, nombre, datos, codigo_sic, anio, fecha_creacion
  FROM "SphaerAI_contratos"
  WHERE anio = $1
`;

export const getContratoBySicAnio = `
  SELECT id, nombre, datos, codigo_sic, anio, fecha_creacion
  FROM "SphaerAI_contratos"
  WHERE codigo_sic = $1 AND anio = $2
`;

export const getAniosContratos = `
  SELECT DISTINCT anio
  FROM "SphaerAI_contratos"
  WHERE anio IS NOT NULL
  ORDER BY anio
`;

export const insertContrato = `
  INSERT INTO "SphaerAI_contratos" (nombre, datos, codigo_sic, anio, fecha_creacion)
  VALUES ($1, $2, $3, $4, NOW())
  RETURNING id
`;

export const updateContrato = `
  UPDATE "SphaerAI_contratos"
  SET nombre = $1, datos = $2, fecha_creacion = NOW()
  WHERE id = $3
`;

// ─── Porcentaje de cubrimiento ───────────────────────────────────────────────
export const getPorcentajeByAnio = `
  SELECT anio, mes, valor
  FROM "SphaerAI_porcentaje_cubrimiento"
  WHERE anio = $1
  ORDER BY mes
`;

export const deletePorcentajeByAnio = `
  DELETE FROM "SphaerAI_porcentaje_cubrimiento"
  WHERE anio = $1
`;

export const insertPorcentaje = `
  INSERT INTO "SphaerAI_porcentaje_cubrimiento" (anio, mes, valor, fecha_creacion)
  VALUES ($1, $2, $3, NOW())
`;