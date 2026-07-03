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

export const ensureCubrimientoTables = `
  CREATE TABLE IF NOT EXISTS "SphaerAI_cubrimiento_versiones" (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    user_id INTEGER,
    session_id INTEGER,
    nombre VARCHAR(255),
    anio INTEGER,
    payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

// Versiones por usuario (persisten entre sesiones), expiran a 24h.
export const deleteExpiredCubrimientoVersions = `
  DELETE FROM "SphaerAI_cubrimiento_versiones"
  WHERE created_at < NOW() - INTERVAL '24 hours'
`;

export const getNextCubrimientoVersion = `
  SELECT COALESCE(MAX(version), 0) + 1 AS next
  FROM "SphaerAI_cubrimiento_versiones" WHERE user_id = $1
`;

export const insertCubrimientoVersion = `
  INSERT INTO "SphaerAI_cubrimiento_versiones"
    (version, user_id, session_id, nombre, anio, payload)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id, version, created_at
`;

export const listCubrimientoVersions = `
  SELECT id, version, nombre, anio, created_at
  FROM "SphaerAI_cubrimiento_versiones"
  WHERE user_id = $1
  ORDER BY version DESC
`;

export const getCubrimientoVersionById = `
  SELECT id, version, nombre, anio, payload, created_at
  FROM "SphaerAI_cubrimiento_versiones" WHERE id = $1
`;