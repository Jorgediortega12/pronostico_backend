export const ensureAuditoriaTable = `
  CREATE TABLE IF NOT EXISTS "aud_auditoria" (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(255) NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    accion VARCHAR(100) NOT NULL DEFAULT 'Ingreso',
    status VARCHAR(100) DEFAULT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Bogota')
  );
`;

export const insertAuditoria = `
  INSERT INTO "aud_auditoria" (usuario, modulo, accion, status)
  VALUES ($1, $2, $3, $4)
  RETURNING *;
`;

export const getAuditoria = `
  SELECT id, usuario, modulo, accion, status,
         TO_CHAR(fecha_hora, 'YYYY-MM-DD HH24:MI:SS') AS fecha_hora
  FROM "aud_auditoria"
  WHERE
    ($1::date IS NULL OR fecha_hora::date >= $1::date)
    AND ($2::date IS NULL OR fecha_hora::date <= $2::date)
    AND ($3::text IS NULL OR LOWER(usuario) LIKE LOWER('%' || $3 || '%'))
    AND ($4::text IS NULL OR LOWER(modulo) = LOWER($4))
  ORDER BY fecha_hora DESC
  LIMIT $5 OFFSET $6;
`;

export const countAuditoria = `
  SELECT COUNT(*) AS total
  FROM "aud_auditoria"
  WHERE
    ($1::date IS NULL OR fecha_hora::date >= $1::date)
    AND ($2::date IS NULL OR fecha_hora::date <= $2::date)
    AND ($3::text IS NULL OR LOWER(usuario) LIKE LOWER('%' || $3 || '%'))
    AND ($4::text IS NULL OR LOWER(modulo) = LOWER($4));
`;
