// Configuración global de "división de mercado": los datos reales de demanda con fecha (o fin de
// periodo, para históricos mensuales/anuales) anterior o igual a fecha_limite se multiplican por
// porcentaje / 100 al mostrarse; los posteriores se muestran sin modificar.
// Es una sola fila por base de datos (por empresa). Nunca se aplica a los modelos de pronóstico.
export const ensureDemandSplitConfigTable = `
  CREATE TABLE IF NOT EXISTS "demand_split_config" (
    id SERIAL PRIMARY KEY,
    fecha_limite DATE NOT NULL DEFAULT CURRENT_DATE,
    porcentaje NUMERIC(7, 3) NOT NULL DEFAULT 100
      CHECK (porcentaje >= 0 AND porcentaje <= 100),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

export const obtenerConfig = `
  SELECT id, TO_CHAR(fecha_limite, 'YYYY-MM-DD') AS fecha_limite,
         porcentaje::float8 AS porcentaje, updated_at
  FROM demand_split_config
  ORDER BY id ASC
  LIMIT 1;
`;

// Config por defecto (sin efecto: 100 %). Solo se inserta si la tabla está vacía.
export const crearConfigPorDefecto = `
  INSERT INTO demand_split_config (fecha_limite, porcentaje)
  SELECT CURRENT_DATE, 100
  WHERE NOT EXISTS (SELECT 1 FROM demand_split_config)
  RETURNING id;
`;

export const actualizarConfig = `
  UPDATE demand_split_config
  SET fecha_limite = $1, porcentaje = $2, updated_at = NOW()
  WHERE id = (SELECT id FROM demand_split_config ORDER BY id ASC LIMIT 1)
  RETURNING id, TO_CHAR(fecha_limite, 'YYYY-MM-DD') AS fecha_limite,
            porcentaje::float8 AS porcentaje, updated_at;
`;
