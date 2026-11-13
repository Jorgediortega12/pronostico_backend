// Ajustes generales de la empresa (una fila por clave). La tabla se crea sola la primera vez que se usa, en la base
// de cada empresa, igual que las demás configuraciones.
export const ensureConfiguracionGeneralTable = `
  CREATE TABLE IF NOT EXISTS "configuracion_general" (
    clave VARCHAR(100) PRIMARY KEY,
    valor TEXT NOT NULL,
    actualizado TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Bogota')
  );
`;

export const obtenerValor = `
  SELECT valor FROM configuracion_general WHERE clave = $1;
`;

export const guardarValor = `
  INSERT INTO configuracion_general (clave, valor, actualizado)
  VALUES ($1, $2, (NOW() AT TIME ZONE 'America/Bogota'))
  ON CONFLICT (clave)
  DO UPDATE SET valor = EXCLUDED.valor, actualizado = EXCLUDED.actualizado
  RETURNING clave, valor, actualizado;
`;
