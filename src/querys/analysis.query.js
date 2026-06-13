export const ensureAnalysisTables = `
  CREATE TABLE IF NOT EXISTS "SphaerAI_analysis_versiones" (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    user_id INTEGER,
    session_id INTEGER,
    nombre VARCHAR(255),
    payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

// Versiones por usuario (persisten entre sesiones), expiran a 24h.
export const deleteExpiredAnalysisVersions = `
  DELETE FROM "SphaerAI_analysis_versiones"
  WHERE created_at < NOW() - INTERVAL '24 hours'
`;

export const getNextAnalysisVersion = `
  SELECT COALESCE(MAX(version), 0) + 1 AS next
  FROM "SphaerAI_analysis_versiones" WHERE user_id = $1
`;

export const insertAnalysisVersion = `
  INSERT INTO "SphaerAI_analysis_versiones"
    (version, user_id, session_id, nombre, payload)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id, version, created_at
`;

export const listAnalysisVersions = `
  SELECT id, version, nombre, created_at
  FROM "SphaerAI_analysis_versiones"
  WHERE user_id = $1
  ORDER BY version DESC
`;

export const getAnalysisVersionById = `
  SELECT id, version, nombre, payload, created_at
  FROM "SphaerAI_analysis_versiones" WHERE id = $1
`;
