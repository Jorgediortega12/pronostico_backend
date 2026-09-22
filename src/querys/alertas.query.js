// Alertas (Gestión de Notificaciones) — MVP: categorías 'mape' y 'demanda'.
// Autoprovisión perezosa por tenant (ver alertas.model.js#ensureTables),
// mismo patrón que cubrimiento.query.js#ensureCubrimientoTables.

export const ensureAlertasTables = `
  CREATE TABLE IF NOT EXISTS alertas_config (
    codigo SERIAL PRIMARY KEY,
    categoria VARCHAR(20) UNIQUE NOT NULL,
    umbral NUMERIC NOT NULL,
    ventana_dias INT,
    canal_push BOOLEAN NOT NULL DEFAULT TRUE,
    canal_correo BOOLEAN NOT NULL DEFAULT FALSE,
    canal_sms BOOLEAN NOT NULL DEFAULT FALSE,
    destinatarios JSONB NOT NULL DEFAULT '[]',
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS alertas (
    codigo SERIAL PRIMARY KEY,
    ucp VARCHAR NOT NULL,
    categoria VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL,
    periodo_inicio INT,
    periodo_fin INT,
    descripcion TEXT NOT NULL,
    metrica_valor NUMERIC NOT NULL,
    metrica_label VARCHAR(30) NOT NULL,
    umbral NUMERIC NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'por_revisar',
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    revisado_en TIMESTAMP,
    UNIQUE (ucp, categoria, fecha)
  );

  CREATE TABLE IF NOT EXISTS alertas_historial (
    codigo SERIAL PRIMARY KEY,
    alerta_id INT NOT NULL REFERENCES alertas(codigo) ON DELETE CASCADE,
    tipo_evento VARCHAR(20) NOT NULL,
    descripcion TEXT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

export const seedAlertasConfigDefaults = `
  INSERT INTO alertas_config (categoria, umbral, ventana_dias, canal_push)
  VALUES
    ('mape', 2.5, NULL, TRUE),
    ('demanda', 8, 30, TRUE)
  ON CONFLICT (categoria) DO NOTHING
`;

// ─── Configuración ───────────────────────────────────────────────────────────

export const getAlertasConfig = `
  SELECT codigo, categoria, umbral, ventana_dias, canal_push, canal_correo,
         canal_sms, destinatarios, actualizado_en
  FROM alertas_config
  ORDER BY categoria
`;

export const updateAlertasConfigByCategoria = `
  UPDATE alertas_config
  SET umbral = $1,
      ventana_dias = $2,
      canal_push = $3,
      canal_correo = $4,
      canal_sms = $5,
      destinatarios = $6,
      actualizado_en = NOW()
  WHERE categoria = $7
  RETURNING codigo, categoria, umbral, ventana_dias, canal_push, canal_correo,
            canal_sms, destinatarios, actualizado_en
`;

// ─── Mercados (MC / ucp) ──────────────────────────────────────────────────────
// Mismo query que configuracion.query.js#cargarUCP — lista de mercados activos.

export const listarUcpActivos = `
  SELECT DISTINCT(aux2) AS mc
  FROM ucp
  WHERE codpadre = 2
    AND estado = 1
    AND aux2 IS NOT NULL
    AND aux2 <> ''
  ORDER BY aux2 ASC
`;

// ─── Datos fuente para el motor de cálculo ───────────────────────────────────

export const getUltimaFechaReal = `
  SELECT fecha FROM actualizaciondatos WHERE ucp = $1 ORDER BY fecha DESC LIMIT 1
`;

export const getRealYPronosticoPorFecha = `
  SELECT
    a.fecha,
    a.p1 AS r1, a.p2 AS r2, a.p3 AS r3, a.p4 AS r4, a.p5 AS r5, a.p6 AS r6,
    a.p7 AS r7, a.p8 AS r8, a.p9 AS r9, a.p10 AS r10, a.p11 AS r11, a.p12 AS r12,
    a.p13 AS r13, a.p14 AS r14, a.p15 AS r15, a.p16 AS r16, a.p17 AS r17, a.p18 AS r18,
    a.p19 AS r19, a.p20 AS r20, a.p21 AS r21, a.p22 AS r22, a.p23 AS r23, a.p24 AS r24,
    p.p1 AS f1, p.p2 AS f2, p.p3 AS f3, p.p4 AS f4, p.p5 AS f5, p.p6 AS f6,
    p.p7 AS f7, p.p8 AS f8, p.p9 AS f9, p.p10 AS f10, p.p11 AS f11, p.p12 AS f12,
    p.p13 AS f13, p.p14 AS f14, p.p15 AS f15, p.p16 AS f16, p.p17 AS f17, p.p18 AS f18,
    p.p19 AS f19, p.p20 AS f20, p.p21 AS f21, p.p22 AS f22, p.p23 AS f23, p.p24 AS f24
  FROM actualizaciondatos a
  INNER JOIN pronosticos p ON p.ucp = a.ucp AND p.fecha = a.fecha
  WHERE a.ucp = $1 AND a.fecha = $2
  LIMIT 1
`;

export const getTotalDiarioReal = `
  SELECT
    (p1+p2+p3+p4+p5+p6+p7+p8+p9+p10+p11+p12+p13+p14+p15+p16+p17+p18+p19+p20+p21+p22+p23+p24) AS total
  FROM actualizaciondatos
  WHERE ucp = $1 AND fecha = $2
  LIMIT 1
`;

export const getPromedioTotalDiarioTipico = `
  SELECT
    AVG(p1+p2+p3+p4+p5+p6+p7+p8+p9+p10+p11+p12+p13+p14+p15+p16+p17+p18+p19+p20+p21+p22+p23+p24) AS promedio,
    COUNT(*) AS muestras
  FROM actualizaciondatos
  WHERE ucp = $1
    AND fecha < $2
    AND fecha >= ($2::date - ($3 || ' days')::interval)
    AND EXTRACT(DOW FROM fecha) = EXTRACT(DOW FROM $2::date)
`;

// ─── Alertas ───────────────────────────────────────────────────────────────────

export const insertAlerta = `
  INSERT INTO alertas
    (ucp, categoria, fecha, periodo_inicio, periodo_fin, descripcion,
     metrica_valor, metrica_label, umbral, estado)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  ON CONFLICT (ucp, categoria, fecha) DO NOTHING
  RETURNING *
`;

export const getAlertaByCodigo = `
  SELECT * FROM alertas WHERE codigo = $1
`;

export const marcarAlertaRevisada = `
  UPDATE alertas
  SET estado = 'revisado', revisado_en = NOW()
  WHERE codigo = $1
  RETURNING *
`;

export const insertHistorial = `
  INSERT INTO alertas_historial (alerta_id, tipo_evento, descripcion)
  VALUES ($1, $2, $3)
  RETURNING *
`;

export const getHistorialByAlertaId = `
  SELECT * FROM alertas_historial WHERE alerta_id = $1 ORDER BY creado_en ASC
`;
