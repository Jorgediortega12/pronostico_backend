// Configuración de credenciales de la API externa EPM (una sola fila,
// compartida por toda la app — no es por mercado).

export const crearTablaEpmConfig = `
  CREATE TABLE IF NOT EXISTS epm_config (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    tenant_id VARCHAR(255),
    client_id VARCHAR(255),
    client_secret_enc TEXT,
    scope VARCHAR(255),
    login_url VARCHAR(500),
    consulta_url VARCHAR(500),
    subscription_key_enc TEXT,
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT epm_config_single_row CHECK (id = 1)
  );
`;

export const obtenerEpmConfig = `SELECT * FROM epm_config WHERE id = 1;`;

export const upsertEpmConfig = `
  INSERT INTO epm_config
    (id, tenant_id, client_id, client_secret_enc, scope, login_url, consulta_url, subscription_key_enc, actualizado_en)
  VALUES
    (1, $1, $2, $3, $4, $5, $6, $7, NOW())
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    client_id = EXCLUDED.client_id,
    client_secret_enc = EXCLUDED.client_secret_enc,
    scope = EXCLUDED.scope,
    login_url = EXCLUDED.login_url,
    consulta_url = EXCLUDED.consulta_url,
    subscription_key_enc = EXCLUDED.subscription_key_enc,
    actualizado_en = NOW()
  RETURNING *;
`;
