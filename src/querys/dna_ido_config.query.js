// Empresa (tal como aparece en el campo "descripcion" de los eventos del
// portal IDO de XM, ej. "(EPM)") — se crea una única vez y se reutiliza.
export const ensureDnaIdoEmpresasTable = `
  CREATE TABLE IF NOT EXISTS "dna_ido_empresas" (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    CONSTRAINT dna_ido_empresas_nombre_uq UNIQUE (nombre)
  );
`;

// Relación: municipios por mercado (mc/UCP) + empresa. Se usa para filtrar
// los eventos de XM IDO y asignarlos al mercado correcto.
export const ensureDnaIdoConfigTable = `
  CREATE TABLE IF NOT EXISTS "dna_ido_config" (
    id SERIAL PRIMARY KEY,
    mc VARCHAR(255) NOT NULL,
    empresa_id INT NOT NULL REFERENCES dna_ido_empresas(id) ON DELETE CASCADE,
    municipios TEXT[] NOT NULL DEFAULT '{}',
    CONSTRAINT dna_ido_config_mc_empresa_uq UNIQUE (mc, empresa_id)
  );
`;

// Migra instalaciones que ya tenían el esquema viejo (empresa como texto
// repetido en cada fila) al nuevo esquema relacional, sin perder datos.
export const migrarEsquemaEmpresaTexto = `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'dna_ido_config' AND column_name = 'empresa'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'dna_ido_config' AND column_name = 'empresa_id'
    ) THEN
      ALTER TABLE dna_ido_config ADD COLUMN empresa_id INT;

      INSERT INTO dna_ido_empresas (nombre)
      SELECT DISTINCT empresa FROM dna_ido_config
      ON CONFLICT (nombre) DO NOTHING;

      UPDATE dna_ido_config c
      SET empresa_id = e.id
      FROM dna_ido_empresas e
      WHERE e.nombre = c.empresa;

      ALTER TABLE dna_ido_config DROP CONSTRAINT IF EXISTS dna_ido_config_empresa_uq;
      ALTER TABLE dna_ido_config ALTER COLUMN empresa_id SET NOT NULL;
      ALTER TABLE dna_ido_config
        ADD CONSTRAINT dna_ido_config_empresa_id_fkey
        FOREIGN KEY (empresa_id) REFERENCES dna_ido_empresas(id) ON DELETE CASCADE;
      ALTER TABLE dna_ido_config
        ADD CONSTRAINT dna_ido_config_mc_empresa_uq UNIQUE (mc, empresa_id);
      ALTER TABLE dna_ido_config DROP COLUMN empresa;
    END IF;
  END $$;
`;

// ── Empresas ─────────────────────────────────────────────────────────────────
export const crearEmpresa = `
  INSERT INTO dna_ido_empresas (nombre)
  VALUES ($1)
  RETURNING *;
`;

export const obtenerEmpresas = `
  SELECT * FROM dna_ido_empresas
  ORDER BY nombre ASC;
`;

// Hard delete — al borrar la empresa se eliminan en cascada sus relaciones
// de mercado/municipios (ON DELETE CASCADE en dna_ido_config.empresa_id).
export const eliminarEmpresa = `
  DELETE FROM dna_ido_empresas
  WHERE id = $1
  RETURNING *;
`;

// ── Config (mc + empresa + municipios) ───────────────────────────────────────
export const crearConfig = `
  INSERT INTO dna_ido_config (mc, empresa_id, municipios)
  VALUES ($1, $2, $3)
  RETURNING *;
`;

export const obtenerConfigs = `
  SELECT c.id, c.mc, c.empresa_id, e.nombre AS empresa, c.municipios
  FROM dna_ido_config c
  JOIN dna_ido_empresas e ON e.id = c.empresa_id
  ORDER BY c.id ASC;
`;

export const obtenerConfigsPorMC = `
  SELECT c.id, c.mc, c.empresa_id, e.nombre AS empresa, c.municipios
  FROM dna_ido_config c
  JOIN dna_ido_empresas e ON e.id = c.empresa_id
  WHERE c.mc = $1
  ORDER BY c.id ASC;
`;

export const actualizarConfig = `
  UPDATE dna_ido_config
  SET mc         = $1,
      empresa_id = $2,
      municipios = $3
  WHERE id = $4
  RETURNING *;
`;

// Hard delete, igual que circuitos — esta tabla no tiene columna estado.
export const eliminarConfig = `
  DELETE FROM dna_ido_config
  WHERE id = $1
  RETURNING *;
`;
