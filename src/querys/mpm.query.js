export const ensureMpmTables = `
  CREATE TABLE IF NOT EXISTS "SphaerAI_mpm_versiones" (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    user_id INTEGER,
    session_id INTEGER,
    nombre VARCHAR(255),
    modelo_id INTEGER,
    tipo_archivo INTEGER,
    last_date DATE,
    previous_days INTEGER,
    payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

export const deleteExpiredMpmVersions = `
  DELETE FROM "SphaerAI_mpm_versiones"
  WHERE created_at < NOW() - INTERVAL '24 hours'
`;

export const getNextMpmVersion = `
  SELECT COALESCE(MAX(version), 0) + 1 AS next
  FROM "SphaerAI_mpm_versiones" WHERE user_id = $1
`;

export const insertMpmVersion = `
  INSERT INTO "SphaerAI_mpm_versiones"
    (version, user_id, session_id, nombre, modelo_id, tipo_archivo, last_date, previous_days, payload)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING id, version, created_at
`;

export const listMpmVersions = `
  SELECT id, version, nombre, modelo_id, tipo_archivo, last_date, previous_days, created_at
  FROM "SphaerAI_mpm_versiones"
  WHERE user_id = $1
  ORDER BY version DESC
`;

export const getMpmVersionById = `
  SELECT id, version, nombre, modelo_id, tipo_archivo, last_date, previous_days, payload, created_at
  FROM "SphaerAI_mpm_versiones" WHERE id = $1
`;
