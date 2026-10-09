// Consultas de la UI "Clima 360°" (Mapa climático).
//  - Tenant (BD de la empresa): clima_mapa_puntos / _actual / _hora / _dia / clima_alertas
//  - jano_proxy (compartida): datos_clima — histórico horario por ciudad

// ─── Tenant ──────────────────────────────────────────────────────────────────

export const asegurarTablaAlertas = `
  CREATE TABLE IF NOT EXISTS clima_alertas (
    id SERIAL PRIMARY KEY,
    id_punto INT NOT NULL REFERENCES clima_mapa_puntos(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    titulo VARCHAR(80) NOT NULL,
    nivel VARCHAR(10) NOT NULL,
    inicio TIMESTAMP NOT NULL,
    fin TIMESTAMP NOT NULL,
    descripcion TEXT NOT NULL,
    valor_max NUMERIC,
    creada_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizada_en TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_punto, tipo, inicio)
  );
`;

// ids vacío -> todos los puntos activos
export const puntosConActual = `
  SELECT p.id, p.nombre, p.lat, p.lng, p.ucp, p.orden,
         p.ciudad_nombre, p.accuweather_id, p.openweather_id,
         a.fecha AS actual_fecha, a.stemp, a.sensacion, a.vel_viento, a.icon,
         a.icon_des, a.humedad, a.presion, a.rafaga, a.viento_dir, a.lluvia_1h
  FROM clima_mapa_puntos p
  LEFT JOIN clima_mapa_actual a ON a.id_punto = p.id
  WHERE p.activo = TRUE
    AND (cardinality($1::int[]) = 0 OR p.id = ANY($1::int[]))
  ORDER BY p.orden ASC, p.nombre ASC
`;

export const horaRango = `
  SELECT id_punto, to_char(fecha, 'YYYY-MM-DD') AS fecha, bloques
  FROM clima_mapa_hora
  WHERE id_punto = ANY($1::int[]) AND fecha BETWEEN $2::date AND $3::date
  ORDER BY id_punto, fecha
`;

export const diaRango = `
  SELECT id_punto, to_char(fecha, 'YYYY-MM-DD') AS fecha, icon, icon_des,
         stemp_dia, stemp_noche, pop_max
  FROM clima_mapa_dia
  WHERE id_punto = ANY($1::int[]) AND fecha >= $2::date
  ORDER BY id_punto, fecha
`;

export const upsertAlerta = `
  INSERT INTO clima_alertas (id_punto, tipo, titulo, nivel, inicio, fin, descripcion, valor_max)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (id_punto, tipo, inicio) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    nivel = EXCLUDED.nivel,
    fin = EXCLUDED.fin,
    descripcion = EXCLUDED.descripcion,
    valor_max = EXCLUDED.valor_max,
    actualizada_en = NOW()
`;

export const listarAlertas = `
  SELECT a.id, a.id_punto, p.nombre AS ciudad, a.tipo, a.titulo, a.nivel,
         to_char(a.inicio, 'YYYY-MM-DD"T"HH24:MI:SS') AS inicio,
         to_char(a.fin, 'YYYY-MM-DD"T"HH24:MI:SS') AS fin,
         a.descripcion, a.valor_max
  FROM clima_alertas a
  JOIN clima_mapa_puntos p ON p.id = a.id_punto
  WHERE a.fin >= $1::timestamp
    AND (cardinality($2::int[]) = 0 OR a.id_punto = ANY($2::int[]))
  ORDER BY a.inicio DESC
`;

// Reportes generados y guardados (el archivo vive en Descargas: archivos/carpetas).
export const asegurarTablaReportes = `
  CREATE TABLE IF NOT EXISTS clima_reportes (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    formato VARCHAR(5) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    codarchivo INT,
    desde DATE,
    hasta DATE,
    ciudades TEXT,
    tamano_bytes INT,
    usuario_id INT,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

export const insertarReporte = `
  INSERT INTO clima_reportes
    (tipo, titulo, formato, nombre_archivo, codarchivo, desde, hasta, ciudades, tamano_bytes, usuario_id, creado_en)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  RETURNING id
`;

export const listarReportes = `
  SELECT r.id, r.tipo, r.titulo, r.formato, r.nombre_archivo, r.codarchivo,
         to_char(r.desde, 'YYYY-MM-DD') AS desde, to_char(r.hasta, 'YYYY-MM-DD') AS hasta,
         r.ciudades, r.tamano_bytes,
         to_char(r.creado_en, 'YYYY-MM-DD"T"HH24:MI:SS') AS creado_en
  FROM clima_reportes r
  ORDER BY r.creado_en DESC
  LIMIT $1
`;

// ─── jano_proxy ──────────────────────────────────────────────────────────────

const col = (pref, suf) => Array.from({ length: 24 }, (_, i) => `dc.p${i + 1}_${suf}`).join(", ");

// Filas diarias completas (24 periodos de temperatura, humedad, viento y código
// de condición) de la ciudad de un punto. Resolución ciudad -> datos:
//   1) catálogo por IDs AccuWeather/OpenWeather (puntos sueltos),
//   2) config_ciudades_clima.ciudad_id del mercado (ucp),
//   3) match viejo por ucp.
// Mismo criterio que resumenMensualClima/resumenDiarioClima.
export const historicoDiario = `
  WITH c AS (
    SELECT COALESCE(
      (SELECT id FROM catalogo_ciudades_clima
        WHERE ($2::text IS NOT NULL OR $3::text IS NOT NULL)
          AND accuweather_id IS NOT DISTINCT FROM $2::text
          AND openweather_id IS NOT DISTINCT FROM $3::text
        LIMIT 1),
      (SELECT ciudad_id FROM config_ciudades_clima
        WHERE $1::text IS NOT NULL AND LOWER(ucp) = LOWER($1::text) AND ciudad_id IS NOT NULL
        LIMIT 1)
    ) AS ciudad_id
  )
  SELECT to_char(dc.fecha, 'YYYY-MM-DD') AS fecha,
         ${col("", "t")}, ${col("", "h")}, ${col("", "v")}, ${col("", "i")}
  FROM datos_clima dc CROSS JOIN c
  WHERE dc.fecha BETWEEN $4::date AND $5::date
    AND (
      (c.ciudad_id IS NOT NULL AND dc.ciudad_id = c.ciudad_id)
      OR (c.ciudad_id IS NULL AND $1::text IS NOT NULL AND LOWER(dc.ucp) = LOWER($1::text))
    )
  ORDER BY dc.fecha ASC
`;
