// Agente ADEM con el que se calcula la demanda al cargar archivos (Txf/Txr/Tx2) en Análisis de datos.
// Una sola fila por base de datos (por empresa). agente NULL = automático: el primero que haya entre CMMC, CMC y CMEC y, si
// ninguno está, el primero del archivo con DMRE o DMNR (el comportamiento de siempre).
export const ensureAdemAgenteConfigTable = `
  CREATE TABLE IF NOT EXISTS "adem_agente_config" (
    id SERIAL PRIMARY KEY,
    agente VARCHAR(20),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

export const obtenerConfig = `
  SELECT id, agente, updated_at
  FROM adem_agente_config
  ORDER BY id ASC
  LIMIT 1;
`;

// Config por defecto (automático). Solo se inserta si la tabla está vacía.
export const crearConfigPorDefecto = `
  INSERT INTO adem_agente_config (agente)
  SELECT NULL
  WHERE NOT EXISTS (SELECT 1 FROM adem_agente_config)
  RETURNING id;
`;

export const actualizarConfig = `
  UPDATE adem_agente_config
  SET agente = $1, updated_at = NOW()
  WHERE id = (SELECT id FROM adem_agente_config ORDER BY id ASC LIMIT 1)
  RETURNING id, agente, updated_at;
`;
