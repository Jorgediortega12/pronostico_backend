// config_ciudades_clima y owm_ciudades_co viven en jano_proxy (la BD
// centralizada) — ver scripts/ImportDataClima.js y ConfiguracionModel para
// el mismo patrón de conexión. Cada fila de config_ciudades_clima queda
// scoped por db_empresa (session.basededatos del tenant dueño de ese
// mercado), aunque la tabla sea compartida entre todas las empresas.

export const listarConfigsPorEmpresa = `
  SELECT id, db_empresa, ucp, ciudad_nombre, accuweather_id, openweather_id,
         creado_en, actualizado_en
  FROM config_ciudades_clima
  WHERE db_empresa = $1
  ORDER BY ucp ASC;
`;

export const upsertConfig = `
  INSERT INTO config_ciudades_clima
    (db_empresa, ucp, ciudad_nombre, accuweather_id, openweather_id, actualizado_en)
  VALUES ($1, $2, $3, $4, $5, NOW())
  ON CONFLICT (db_empresa, ucp) DO UPDATE SET
    ciudad_nombre = EXCLUDED.ciudad_nombre,
    accuweather_id = EXCLUDED.accuweather_id,
    openweather_id = EXCLUDED.openweather_id,
    actualizado_en = NOW()
  RETURNING *;
`;

export const eliminarConfig = `
  DELETE FROM config_ciudades_clima
  WHERE db_empresa = $1 AND ucp = $2
  RETURNING *;
`;

export const buscarCiudadesOwm = `
  SELECT id, nombre, estado, pais, lat, lon
  FROM owm_ciudades_co
  WHERE nombre ILIKE $1
  ORDER BY nombre ASC
  LIMIT 15;
`;

// Ciudades que YA se le configuraron a algún mercado (de cualquier
// empresa, la tabla es compartida) — para poder reusar una combinación ya
// probada (con historial acumulándose en datos_clima) en vez de tener que
// volver a buscarla o escribirla a mano.
export const listarCiudadesYaConfiguradas = `
  SELECT DISTINCT ON (ciudad_nombre, accuweather_id, openweather_id)
    ciudad_nombre, accuweather_id, openweather_id
  FROM config_ciudades_clima
  WHERE ciudad_nombre IS NOT NULL
    AND (accuweather_id IS NOT NULL OR openweather_id IS NOT NULL)
  ORDER BY ciudad_nombre ASC, accuweather_id ASC, openweather_id ASC;
`;
