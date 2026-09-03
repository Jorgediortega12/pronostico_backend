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

// catalogo_ciudades_clima: combinaciones ciudad+IDs reusables que NO están
// atadas a ningún mercado/empresa en particular (a diferencia de
// config_ciudades_clima, que sí queda scoped por db_empresa+ucp). Aquí
// viven, por ejemplo, los IDs del viejo CIUDADES_MAP hardcodeado — datos
// de ciudades que tienen años de historial en datos_clima pero cuyo
// mercado original ya no está activo en Redis, así que no se puede saber
// a qué empresa asociarlos. Cualquier empresa puede reusarlos igual.
export const crearTablaCatalogoCiudades = `
  CREATE TABLE IF NOT EXISTS catalogo_ciudades_clima (
    id SERIAL PRIMARY KEY,
    ciudad_nombre VARCHAR(255) NOT NULL,
    accuweather_id VARCHAR(50),
    openweather_id VARCHAR(50),
    origen VARCHAR(100),
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (ciudad_nombre, accuweather_id, openweather_id)
  );
`;

export const upsertCatalogoCiudad = `
  INSERT INTO catalogo_ciudades_clima
    (ciudad_nombre, accuweather_id, openweather_id, origen)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (ciudad_nombre, accuweather_id, openweather_id) DO NOTHING
  RETURNING *;
`;

// Listado completo del catálogo (con id) para poder editarlo — los nombres
// heredados del CIUDADES_MAP viejo (Bolivar, Planeta, GM, TubosCaribe...)
// eran etiquetas de mercado, no el nombre real de la ciudad.
export const listarCatalogoCompleto = `
  SELECT id, ciudad_nombre, accuweather_id, openweather_id, origen, creado_en
  FROM catalogo_ciudades_clima
  ORDER BY ciudad_nombre ASC;
`;

export const actualizarCatalogoCiudad = `
  UPDATE catalogo_ciudades_clima
  SET ciudad_nombre = $2,
      accuweather_id = $3,
      openweather_id = $4
  WHERE id = $1
  RETURNING *;
`;

// Vista unificada para el catálogo de superadmin: TODO lo que tiene IDs de
// clima reales, ya esté suelto (catalogo_ciudades_clima) o ya atado a un
// mercado (config_ciudades_clima) — para poder ver y renombrar cualquiera
// desde un solo lugar, en vez de solo las huérfanas.
export const listarTodasLasCiudades = `
  SELECT
    id,
    'catalogo' AS origen_tabla,
    ciudad_nombre,
    accuweather_id,
    openweather_id,
    origen,
    NULL::text AS ucp,
    NULL::text AS db_empresa,
    creado_en
  FROM catalogo_ciudades_clima
  UNION ALL
  SELECT
    id,
    'mercado' AS origen_tabla,
    ciudad_nombre,
    accuweather_id,
    openweather_id,
    'mercado_configurado' AS origen,
    ucp,
    db_empresa,
    creado_en
  FROM config_ciudades_clima
  ORDER BY ciudad_nombre ASC;
`;

export const actualizarConfigCiudadPorId = `
  UPDATE config_ciudades_clima
  SET ciudad_nombre = $2,
      accuweather_id = $3,
      openweather_id = $4,
      actualizado_en = NOW()
  WHERE id = $1
  RETURNING *;
`;

// Ciudades ya "probadas" y disponibles para reusar en cualquier mercado de
// cualquier empresa — unión de (a) lo que ya se le configuró a algún
// mercado real en config_ciudades_clima y (b) el catálogo suelto de
// catalogo_ciudades_clima (ciudades con historial pero sin mercado activo
// que las reclame hoy). Se trae también el `ucp` original (cuando lo hay)
// porque es la clave real bajo la que vive el histórico en datos_clima —
// quien busca suele conocer el mercado (ej. "Antioquia"), no
// necesariamente el nombre real de la ciudad (ej. "Medellin").
export const listarCiudadesYaConfiguradas = `
  SELECT ciudad_nombre, accuweather_id, openweather_id, ucp FROM (
    SELECT DISTINCT ON (ciudad_nombre, accuweather_id, openweather_id, ucp)
      ciudad_nombre, accuweather_id, openweather_id, ucp
    FROM config_ciudades_clima
    WHERE ciudad_nombre IS NOT NULL
      AND (accuweather_id IS NOT NULL OR openweather_id IS NOT NULL)
    UNION
    SELECT DISTINCT ciudad_nombre, accuweather_id, openweather_id, NULL::text AS ucp
    FROM catalogo_ciudades_clima
  ) AS combinado
  ORDER BY ciudad_nombre ASC, accuweather_id ASC, openweather_id ASC;
`;
