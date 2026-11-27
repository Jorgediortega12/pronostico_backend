-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- Factores de distribución · Curvas típicas cargadas · Nueva subestación INDUSTRIALES (EPM)
--
-- Deja configurado por base de datos lo mismo que se haría a mano desde «Curvas cargadas» (Factores de distribución):
--   · la barra nueva INDUSTR1 (nombre de la barra en el formato de EPM) en el mercado indicado;
--   · el grupo «Traslado de carga a INDUSTRIALES» con las cuatro curvas que envió EPM (MVA: hábil, sábado y festivo × 24 periodos)
--     de GUAYABA1, POBLADO1, SN_DIEG1 y CENTRAL1, con el factor de potencia tomado del histórico de cada una;
--   · lo trasladado se RESTA a esas cuatro barras (la suma de las cuatro es la curva de INDUSTRIALES que envió EPM);
--   · las medidas con código reservado CT-<id>-D (suma al destino) y CT-<id>-O (resta al origen), activa (AE) y reactiva (R1),
--     para todas las fechas con medidas reales del mercado.
--
-- Es idempotente: si el grupo ya existe se borra con sus medidas y se vuelve a crear. No toca medidas reales.
-- Ejecutar completo, con psql o cualquier cliente, sobre la base de la empresa (la de EPM).
-- Las fechas nuevas de medidas que lleguen después las completa solo el backend (no hace falta repetirlo).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════

-- 1) Tablas del módulo (las mismas que crea el backend la primera vez que se abre «Curvas cargadas»).
CREATE TABLE IF NOT EXISTS factores_curvas_grupos (
  id SERIAL PRIMARY KEY,
  mc VARCHAR(100) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  destino_barra_id INTEGER NOT NULL,
  descontar BOOLEAN NOT NULL DEFAULT TRUE,
  habilitar INTEGER NOT NULL DEFAULT 1,
  vigente_desde DATE,
  vigente_hasta DATE,
  observaciones TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS factores_curvas_componentes (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER NOT NULL REFERENCES factores_curvas_grupos(id) ON DELETE CASCADE,
  origen_barra_id INTEGER,
  unidad VARCHAR(3) NOT NULL DEFAULT 'MVA',
  fp_modo VARCHAR(10),
  fp_valor NUMERIC(6,5),
  fp_barra_id INTEGER,
  fp_desde DATE,
  fp_hasta DATE
);
CREATE TABLE IF NOT EXISTS factores_curvas_valores (
  componente_id INTEGER NOT NULL REFERENCES factores_curvas_componentes(id) ON DELETE CASCADE,
  tipo_dia VARCHAR(10) NOT NULL,
  dato CHAR(1) NOT NULL,
  p1 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p2 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p3 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p4 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p5 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p6 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p7 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p8 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p9 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p10 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p11 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p12 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p13 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p14 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p15 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p16 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p17 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p18 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p19 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p20 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p21 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p22 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p23 DOUBLE PRECISION NOT NULL DEFAULT 0,
  p24 DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (componente_id, tipo_dia, dato)
);
CREATE INDEX IF NOT EXISTS idx_factores_curvas_grupos_mc ON factores_curvas_grupos (mc);
CREATE INDEX IF NOT EXISTS idx_factores_curvas_componentes_grupo ON factores_curvas_componentes (grupo_id);

-- 2) Configuración y carga.
DO $carga$
DECLARE
  -- ═════ AJUSTES (lo único que normalmente se cambia) ═════
  v_mc        text := 'Antioquia';                          -- mercado (columna mc de barras)
  v_destino   text := 'INDUSTR1';                           -- barra que recibe la carga
  v_nombre    text := 'Traslado de carga a INDUSTRIALES';   -- nombre del grupo
  v_fp_desde  date := DATE '2026-09-01';                    -- rango del histórico del que se toma el factor de potencia
  v_fp_hasta  date := DATE '2026-11-15';
  v_vig_desde date := NULL;                                 -- vigencia de las curvas (NULL = siempre)
  v_vig_hasta date := NULL;                                 -- poner aquí la fecha en que ya haya medidas reales de la barra nueva
  -- ═════ fin de ajustes ═════

  v_sql_prom text := $prom$
WITH base AS (
  SELECT me.fecha, substring(me.flujo from 1 for 1) AS energia,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p1,0)/1000 ELSE COALESCE(me.p1,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p1,0)/1000 ELSE COALESCE(me.p1,0) END) * a.factor::numeric) END)) AS p1,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p2,0)/1000 ELSE COALESCE(me.p2,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p2,0)/1000 ELSE COALESCE(me.p2,0) END) * a.factor::numeric) END)) AS p2,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p3,0)/1000 ELSE COALESCE(me.p3,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p3,0)/1000 ELSE COALESCE(me.p3,0) END) * a.factor::numeric) END)) AS p3,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p4,0)/1000 ELSE COALESCE(me.p4,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p4,0)/1000 ELSE COALESCE(me.p4,0) END) * a.factor::numeric) END)) AS p4,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p5,0)/1000 ELSE COALESCE(me.p5,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p5,0)/1000 ELSE COALESCE(me.p5,0) END) * a.factor::numeric) END)) AS p5,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p6,0)/1000 ELSE COALESCE(me.p6,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p6,0)/1000 ELSE COALESCE(me.p6,0) END) * a.factor::numeric) END)) AS p6,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p7,0)/1000 ELSE COALESCE(me.p7,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p7,0)/1000 ELSE COALESCE(me.p7,0) END) * a.factor::numeric) END)) AS p7,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p8,0)/1000 ELSE COALESCE(me.p8,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p8,0)/1000 ELSE COALESCE(me.p8,0) END) * a.factor::numeric) END)) AS p8,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p9,0)/1000 ELSE COALESCE(me.p9,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p9,0)/1000 ELSE COALESCE(me.p9,0) END) * a.factor::numeric) END)) AS p9,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p10,0)/1000 ELSE COALESCE(me.p10,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p10,0)/1000 ELSE COALESCE(me.p10,0) END) * a.factor::numeric) END)) AS p10,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p11,0)/1000 ELSE COALESCE(me.p11,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p11,0)/1000 ELSE COALESCE(me.p11,0) END) * a.factor::numeric) END)) AS p11,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p12,0)/1000 ELSE COALESCE(me.p12,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p12,0)/1000 ELSE COALESCE(me.p12,0) END) * a.factor::numeric) END)) AS p12,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p13,0)/1000 ELSE COALESCE(me.p13,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p13,0)/1000 ELSE COALESCE(me.p13,0) END) * a.factor::numeric) END)) AS p13,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p14,0)/1000 ELSE COALESCE(me.p14,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p14,0)/1000 ELSE COALESCE(me.p14,0) END) * a.factor::numeric) END)) AS p14,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p15,0)/1000 ELSE COALESCE(me.p15,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p15,0)/1000 ELSE COALESCE(me.p15,0) END) * a.factor::numeric) END)) AS p15,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p16,0)/1000 ELSE COALESCE(me.p16,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p16,0)/1000 ELSE COALESCE(me.p16,0) END) * a.factor::numeric) END)) AS p16,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p17,0)/1000 ELSE COALESCE(me.p17,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p17,0)/1000 ELSE COALESCE(me.p17,0) END) * a.factor::numeric) END)) AS p17,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p18,0)/1000 ELSE COALESCE(me.p18,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p18,0)/1000 ELSE COALESCE(me.p18,0) END) * a.factor::numeric) END)) AS p18,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p19,0)/1000 ELSE COALESCE(me.p19,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p19,0)/1000 ELSE COALESCE(me.p19,0) END) * a.factor::numeric) END)) AS p19,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p20,0)/1000 ELSE COALESCE(me.p20,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p20,0)/1000 ELSE COALESCE(me.p20,0) END) * a.factor::numeric) END)) AS p20,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p21,0)/1000 ELSE COALESCE(me.p21,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p21,0)/1000 ELSE COALESCE(me.p21,0) END) * a.factor::numeric) END)) AS p21,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p22,0)/1000 ELSE COALESCE(me.p22,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p22,0)/1000 ELSE COALESCE(me.p22,0) END) * a.factor::numeric) END)) AS p22,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p23,0)/1000 ELSE COALESCE(me.p23,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p23,0)/1000 ELSE COALESCE(me.p23,0) END) * a.factor::numeric) END)) AS p23,
         SUM((CASE WHEN a.valor_absoluto THEN ABS(((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p24,0)/1000 ELSE COALESCE(me.p24,0) END) * a.factor::numeric)) ELSE ((CASE WHEN a.dividir_por_1000 THEN COALESCE(me.p24,0)/1000 ELSE COALESCE(me.p24,0) END) * a.factor::numeric) END)) AS p24
  FROM medidas me
  JOIN agrupaciones a ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo AND a.estado = 1
  WHERE a.barra_id = $1 AND me.codigo_rpm NOT LIKE 'CT-%'
    AND me.fecha >= $2::date AND me.fecha <= $3::date
    AND substring(me.flujo from 1 for 1) IN ('A', 'R')
  GROUP BY me.fecha, energia
), validas AS (
  SELECT fecha FROM base WHERE energia = 'A' AND LEAST(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24) > 0
), dias AS (
  SELECT b.*,
         CASE WHEN EXISTS (SELECT 1 FROM festivos f WHERE f.ucp = $4 AND f.fecha = b.fecha) OR date_part('dow', b.fecha) = 0 THEN 'FESTIVO'
              WHEN date_part('dow', b.fecha) = 6 THEN 'SABADO'
              ELSE 'ORDINARIO' END AS tipo_dia
  FROM base b JOIN validas v ON v.fecha = b.fecha
)
SELECT tipo_dia, energia, count(*)::int AS dias, AVG(p1)::float8 AS p1, AVG(p2)::float8 AS p2, AVG(p3)::float8 AS p3, AVG(p4)::float8 AS p4, AVG(p5)::float8 AS p5, AVG(p6)::float8 AS p6, AVG(p7)::float8 AS p7, AVG(p8)::float8 AS p8, AVG(p9)::float8 AS p9, AVG(p10)::float8 AS p10, AVG(p11)::float8 AS p11, AVG(p12)::float8 AS p12, AVG(p13)::float8 AS p13, AVG(p14)::float8 AS p14, AVG(p15)::float8 AS p15, AVG(p16)::float8 AS p16, AVG(p17)::float8 AS p17, AVG(p18)::float8 AS p18, AVG(p19)::float8 AS p19, AVG(p20)::float8 AS p20, AVG(p21)::float8 AS p21, AVG(p22)::float8 AS p22, AVG(p23)::float8 AS p23, AVG(p24)::float8 AS p24
FROM dias
GROUP BY tipo_dia, energia
$prom$;
  v_sql_mat  text := $mat$
WITH calendario AS (
  SELECT DISTINCT me.fecha
  FROM medidas me
  JOIN agrupaciones a ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo AND a.estado = 1
  JOIN barras b ON b.id = a.barra_id
  WHERE b.mc = $1
    AND me.codigo_rpm NOT LIKE 'CT-%'
    AND ($3::date IS NULL OR me.fecha >= $3::date) AND ($4::date IS NULL OR me.fecha <= $4::date)
    AND ($5::date IS NULL OR me.fecha >= $5::date) AND ($6::date IS NULL OR me.fecha <= $6::date)
), tipos AS (
  SELECT c.fecha,
         CASE WHEN EXISTS (SELECT 1 FROM festivos f WHERE f.ucp = $1 AND f.fecha = c.fecha) OR date_part('dow', c.fecha) = 0 THEN 'FESTIVO'
              WHEN date_part('dow', c.fecha) = 6 THEN 'SABADO'
              ELSE 'ORDINARIO' END AS tipo_dia
  FROM calendario c
)
INSERT INTO medidas (flujo, fecha, codigo_rpm, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24, marcado)
SELECT $2, t.fecha, $7, v.p1, v.p2, v.p3, v.p4, v.p5, v.p6, v.p7, v.p8, v.p9, v.p10, v.p11, v.p12, v.p13, v.p14, v.p15, v.p16, v.p17, v.p18, v.p19, v.p20, v.p21, v.p22, v.p23, v.p24, '0'
FROM tipos t
JOIN factores_curvas_valores v ON v.componente_id = $8::int AND v.tipo_dia = t.tipo_dia AND v.dato = $9
ON CONFLICT (codigo_rpm, fecha, flujo) DO UPDATE SET p1 = EXCLUDED.p1, p2 = EXCLUDED.p2, p3 = EXCLUDED.p3, p4 = EXCLUDED.p4, p5 = EXCLUDED.p5, p6 = EXCLUDED.p6, p7 = EXCLUDED.p7, p8 = EXCLUDED.p8, p9 = EXCLUDED.p9, p10 = EXCLUDED.p10, p11 = EXCLUDED.p11, p12 = EXCLUDED.p12, p13 = EXCLUDED.p13, p14 = EXCLUDED.p14, p15 = EXCLUDED.p15, p16 = EXCLUDED.p16, p17 = EXCLUDED.p17, p18 = EXCLUDED.p18, p19 = EXCLUDED.p19, p20 = EXCLUDED.p20, p21 = EXCLUDED.p21, p22 = EXCLUDED.p22, p23 = EXCLUDED.p23, p24 = EXCLUDED.p24
$mat$;
  v_cols      text := 'p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24';
  v_dest_id   int;
  v_grupo_id  int;
  v_viejos    int[];
  o           record;
  rr          record;
  v_origen_id int;
  v_cid       int;
  v_tipo      text;
  v_a         jsonb;
  v_r         jsonb;
  v_s         float8[];
  v_p         float8[];
  v_q         float8[];
  f           float8;
  pa          float8;
  qr          float8;
  i           int;
  lado        record;
  fl          record;
  v_codigo    text;
  v_filas     int;
  v_total     int := 0;
BEGIN
  -- Barra destino: se usa la que ya exista en el mercado o se crea.
  SELECT id INTO v_dest_id FROM barras WHERE barra = v_destino AND mc = v_mc AND estado = 1 ORDER BY id LIMIT 1;
  IF v_dest_id IS NULL THEN
    INSERT INTO barras (barra, descripcion, nivel_tension, observaciones, habilitar, estado, mc)
    VALUES (v_destino, 'Industriales', 1, 'Barra nueva: carga trasladada desde GUAYABA1, POBLADO1, SN_DIEG1 y CENTRAL1', 1, 1, v_mc)
    RETURNING id INTO v_dest_id;
    RAISE NOTICE 'Barra % creada (id %).', v_destino, v_dest_id;
  END IF;

  -- Idempotencia: si el grupo ya estaba, se quita con sus medidas y agrupaciones CT-.
  SELECT array_agg(c.id) INTO v_viejos
  FROM factores_curvas_componentes c JOIN factores_curvas_grupos g ON g.id = c.grupo_id
  WHERE g.mc = v_mc AND g.nombre = v_nombre;
  IF v_viejos IS NOT NULL THEN
    DELETE FROM medidas      WHERE codigo_rpm IN (SELECT 'CT-' || x || '-D' FROM unnest(v_viejos) x UNION SELECT 'CT-' || x || '-O' FROM unnest(v_viejos) x);
    DELETE FROM agrupaciones WHERE codigo_rpm IN (SELECT 'CT-' || x || '-D' FROM unnest(v_viejos) x UNION SELECT 'CT-' || x || '-O' FROM unnest(v_viejos) x);
    DELETE FROM factores_curvas_grupos WHERE mc = v_mc AND nombre = v_nombre;
    RAISE NOTICE 'Se reemplazó el grupo «%» que ya existía.', v_nombre;
  END IF;

  INSERT INTO factores_curvas_grupos (mc, nombre, destino_barra_id, descontar, habilitar, vigente_desde, vigente_hasta, observaciones)
  VALUES (v_mc, v_nombre, v_dest_id, TRUE, 1, v_vig_desde, v_vig_hasta,
          'Curvas típicas en MVA enviadas por EPM (hábil, sábado y festivo). Cargadas por script SQL.')
  RETURNING id INTO v_grupo_id;

  -- Curvas de EPM en MVA, 24 periodos por tipo de día.
  CREATE TEMP TABLE _epm_curvas (ord int, origen text, tipo_dia text, s float8[]) ON COMMIT DROP;
  INSERT INTO _epm_curvas (ord, origen, tipo_dia, s)
  SELECT CASE origen WHEN 'GUAYABA1' THEN 1 WHEN 'POBLADO1' THEN 2 WHEN 'SN_DIEG1' THEN 3 WHEN 'CENTRAL1' THEN 4 END, origen, tipo_dia, s
  FROM (VALUES
      ('GUAYABA1', 'ORDINARIO', ARRAY[7.363, 7.189, 7.008, 6.878, 6.77, 6.698, 6.884, 7.584, 8.283, 8.791, 9.19, 9.505, 9.744, 9.824, 9.687, 9.889, 9.819, 9.465, 8.92, 8.736, 8.513, 8.216, 7.95, 7.652]::float8[]),
      ('GUAYABA1', 'SABADO', ARRAY[5.371, 4.439, 3.949, 3.762, 3.867, 4.365, 4.777, 5.542, 6.292, 6.761, 6.93, 7.244, 7.365, 7.296, 6.755, 6.172, 5.838, 5.809, 7.635, 8.794, 8.786, 8.267, 7.51, 6.513]::float8[]),
      ('GUAYABA1', 'FESTIVO', ARRAY[4.977, 4.648, 4.104, 3.847, 3.731, 3.946, 3.97, 4.456, 5.434, 6.439, 6.876, 7.128, 7.171, 7.24, 6.734, 6.139, 5.877, 5.839, 7.638, 9.121, 9.294, 8.916, 7.765, 6.176]::float8[]),
      ('POBLADO1', 'ORDINARIO', ARRAY[1.353, 1.264, 1.197, 1.146, 1.106, 1.061, 1.091, 1.284, 1.788, 2.099, 2.262, 2.331, 2.39, 2.402, 2.385, 2.445, 2.453, 2.363, 2.138, 1.948, 1.788, 1.656, 1.524, 1.439]::float8[]),
      ('POBLADO1', 'SABADO', ARRAY[1.326, 1.096, 0.975, 0.929, 0.955, 1.078, 1.18, 1.368, 1.554, 1.669, 1.711, 1.789, 1.818, 1.801, 1.668, 1.524, 1.441, 1.434, 1.885, 2.171, 2.169, 2.041, 1.854, 1.608]::float8[]),
      ('POBLADO1', 'FESTIVO', ARRAY[1.229, 1.148, 1.013, 0.95, 0.921, 0.974, 0.98, 1.1, 1.342, 1.59, 1.698, 1.76, 1.771, 1.788, 1.663, 1.516, 1.451, 1.442, 1.886, 2.252, 2.295, 2.201, 1.917, 1.525]::float8[]),
      ('SN_DIEG1', 'ORDINARIO', ARRAY[2.924, 2.689, 2.531, 2.441, 2.362, 2.407, 2.786, 3.146, 3.442, 3.797, 4.072, 4.33, 4.47, 4.527, 4.483, 4.477, 4.416, 4.245, 4.022, 4.042, 4.018, 3.774, 3.461, 3.179]::float8[]),
      ('SN_DIEG1', 'SABADO', ARRAY[2.474, 2.045, 1.819, 1.733, 1.781, 2.011, 2.201, 2.553, 2.899, 3.115, 3.193, 3.337, 3.393, 3.361, 3.112, 2.843, 2.689, 2.676, 3.517, 4.051, 4.047, 3.809, 3.46, 3.001]::float8[]),
      ('SN_DIEG1', 'FESTIVO', ARRAY[2.293, 2.141, 1.891, 1.772, 1.719, 1.818, 1.829, 2.053, 2.503, 2.966, 3.167, 3.284, 3.304, 3.335, 3.102, 2.828, 2.708, 2.69, 3.519, 4.202, 4.282, 4.107, 3.577, 2.845]::float8[]),
      ('CENTRAL1', 'ORDINARIO', ARRAY[0.748, 0.751, 0.769, 0.676, 0.774, 0.795, 0.699, 0.933, 1.158, 1.286, 1.265, 1.258, 1.329, 1.322, 1.238, 1.278, 1.359, 1.353, 1.102, 1.01, 0.982, 0.952, 0.693, 0.737]::float8[]),
      ('CENTRAL1', 'SABADO', ARRAY[0.733, 0.605, 0.539, 0.513, 0.527, 0.595, 0.652, 0.756, 0.858, 0.922, 0.945, 0.988, 1.004, 0.995, 0.921, 0.842, 0.796, 0.792, 1.041, 1.199, 1.198, 1.128, 1.024, 0.888]::float8[]),
      ('CENTRAL1', 'FESTIVO', ARRAY[0.679, 0.634, 0.56, 0.525, 0.509, 0.538, 0.541, 0.608, 0.741, 0.878, 0.938, 0.972, 0.978, 0.987, 0.918, 0.837, 0.802, 0.796, 1.042, 1.244, 1.267, 1.216, 1.059, 0.842]::float8[])
  ) AS t(origen, tipo_dia, s);

  FOR o IN SELECT DISTINCT ord, origen FROM _epm_curvas ORDER BY ord LOOP
    SELECT id INTO v_origen_id FROM barras WHERE barra = o.origen AND mc = v_mc AND estado = 1 ORDER BY id LIMIT 1;
    IF v_origen_id IS NULL THEN RAISE EXCEPTION 'La barra de origen % no existe en el mercado %.', o.origen, v_mc; END IF;

    INSERT INTO factores_curvas_componentes (grupo_id, origen_barra_id, unidad, fp_modo, fp_valor, fp_barra_id, fp_desde, fp_hasta)
    VALUES (v_grupo_id, v_origen_id, 'MVA', 'BARRA', NULL, v_origen_id, v_fp_desde, v_fp_hasta)
    RETURNING id INTO v_cid;

    -- Promedio histórico de P (activa) y Q (reactiva) por tipo de día y periodo, igual que «Ver FP de esa barra».
    v_a := '{}'::jsonb;
    v_r := '{}'::jsonb;
    FOR rr IN EXECUTE v_sql_prom USING v_origen_id, v_fp_desde, v_fp_hasta, v_mc LOOP
      IF rr.energia = 'A' THEN
        v_a := v_a || jsonb_build_object(rr.tipo_dia, to_jsonb(ARRAY[rr.p1, rr.p2, rr.p3, rr.p4, rr.p5, rr.p6, rr.p7, rr.p8, rr.p9, rr.p10, rr.p11, rr.p12, rr.p13, rr.p14, rr.p15, rr.p16, rr.p17, rr.p18, rr.p19, rr.p20, rr.p21, rr.p22, rr.p23, rr.p24]));
      ELSE
        v_r := v_r || jsonb_build_object(rr.tipo_dia, to_jsonb(ARRAY[rr.p1, rr.p2, rr.p3, rr.p4, rr.p5, rr.p6, rr.p7, rr.p8, rr.p9, rr.p10, rr.p11, rr.p12, rr.p13, rr.p14, rr.p15, rr.p16, rr.p17, rr.p18, rr.p19, rr.p20, rr.p21, rr.p22, rr.p23, rr.p24]));
      END IF;
    END LOOP;

    FOREACH v_tipo IN ARRAY ARRAY['ORDINARIO', 'SABADO', 'FESTIVO'] LOOP
      IF NOT (v_a ? v_tipo AND v_r ? v_tipo) THEN
        RAISE EXCEPTION 'La barra % no tiene medidas completas de % entre % y %; cambia el rango v_fp_desde / v_fp_hasta.', o.origen, v_tipo, v_fp_desde, v_fp_hasta;
      END IF;
      SELECT s INTO v_s FROM _epm_curvas WHERE origen = o.origen AND tipo_dia = v_tipo;
      v_p := ARRAY[]::float8[];
      v_q := ARRAY[]::float8[];
      FOR i IN 0..23 LOOP
        pa := (v_a->v_tipo->>i)::float8;
        qr := (v_r->v_tipo->>i)::float8;
        -- FP del periodo = P / raíz(P² + Q²) del histórico (a 5 decimales); luego P = S·FP y Q = S·raíz(1 − FP²).
        f := CASE WHEN pa * pa + qr * qr = 0 THEN 1 ELSE round((pa / sqrt(pa * pa + qr * qr))::numeric, 5)::float8 END;
        f := least(1, greatest(0, f));
        v_p := v_p || round((v_s[i + 1] * f)::numeric, 5)::float8;
        v_q := v_q || round((v_s[i + 1] * sqrt(greatest(0, 1 - f * f)))::numeric, 5)::float8;
      END LOOP;
      EXECUTE format('INSERT INTO factores_curvas_valores (componente_id, tipo_dia, dato, %s) SELECT $1, $2, $3, a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16], a[17], a[18], a[19], a[20], a[21], a[22], a[23], a[24] FROM (SELECT $4::float8[] AS a) x', v_cols) USING v_cid, v_tipo, 'S', v_s;
      EXECUTE format('INSERT INTO factores_curvas_valores (componente_id, tipo_dia, dato, %s) SELECT $1, $2, $3, a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16], a[17], a[18], a[19], a[20], a[21], a[22], a[23], a[24] FROM (SELECT $4::float8[] AS a) x', v_cols) USING v_cid, v_tipo, 'P', v_p;
      EXECUTE format('INSERT INTO factores_curvas_valores (componente_id, tipo_dia, dato, %s) SELECT $1, $2, $3, a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16], a[17], a[18], a[19], a[20], a[21], a[22], a[23], a[24] FROM (SELECT $4::float8[] AS a) x', v_cols) USING v_cid, v_tipo, 'Q', v_q;
    END LOOP;

    -- Medidas: CT-<id>-D suma a la barra destino y CT-<id>-O resta a la barra de origen; activa (AE) con P y reactiva (R1) con Q.
    FOR lado IN SELECT * FROM (VALUES ('D', v_dest_id, '1'), ('O', v_origen_id, '-1')) AS t(sufijo, barra_id, factor) LOOP
      v_codigo := 'CT-' || v_cid || '-' || lado.sufijo;
      FOR fl IN SELECT * FROM (VALUES ('AE', 'P'), ('R1', 'Q')) AS t(flujo, dato) LOOP
        UPDATE agrupaciones
           SET barra_id = lado.barra_id, factor = lado.factor, estado = 1, habilitar = 1, revision = 'CURVA CARGADA', dividir_por_1000 = FALSE, valor_absoluto = FALSE
         WHERE codigo_rpm = v_codigo AND flujo = fl.flujo;
        IF NOT FOUND THEN
          INSERT INTO agrupaciones (barra_id, codigo_rpm, flujo, habilitar, revision, estado, factor, dividir_por_1000, valor_absoluto)
          VALUES (lado.barra_id, v_codigo, fl.flujo, 1, 'CURVA CARGADA', 1, lado.factor, FALSE, FALSE);
        END IF;
        EXECUTE v_sql_mat USING v_mc, fl.flujo, NULL::date, NULL::date, v_vig_desde, v_vig_hasta, v_codigo, v_cid, fl.dato;
        GET DIAGNOSTICS v_filas = ROW_COUNT;
        v_total := v_total + v_filas;
      END LOOP;
    END LOOP;
    RAISE NOTICE 'Componente % (origen %): listo.', v_cid, o.origen;
  END LOOP;

  RAISE NOTICE 'Grupo % cargado en la barra % (id %): % filas de medidas CT-.', v_grupo_id, v_destino, v_dest_id, v_total;
END
$carga$;

-- 3) Comprobación: fechas con la curva en INDUSTR1 y balance (lo sumado al destino debe ser igual a lo restado a los orígenes).
SELECT
  (SELECT count(DISTINCT me.fecha) FROM medidas me JOIN agrupaciones a ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo
    JOIN barras b ON b.id = a.barra_id WHERE b.barra = 'INDUSTR1' AND a.codigo_rpm LIKE 'CT-%' AND a.flujo = 'AE') AS fechas_con_curva,
  round(sum(CASE WHEN me.codigo_rpm LIKE 'CT-%-D' THEN me.p14 ELSE 0 END)::numeric, 3) AS destino_p14,
  round(sum(CASE WHEN me.codigo_rpm LIKE 'CT-%-O' THEN me.p14 ELSE 0 END)::numeric, 3) AS origenes_p14
FROM medidas me WHERE me.codigo_rpm LIKE 'CT-%' AND me.flujo = 'AE';

-- ── Para deshacerlo (quita el grupo, sus medidas CT- y sus agrupaciones; deja la barra INDUSTR1): ───────────────
-- DO $$ DECLARE v int[]; BEGIN
--   SELECT array_agg(c.id) INTO v FROM factores_curvas_componentes c JOIN factores_curvas_grupos g ON g.id = c.grupo_id WHERE g.nombre = 'Traslado de carga a INDUSTRIALES';
--   DELETE FROM medidas      WHERE codigo_rpm IN (SELECT 'CT-' || x || '-D' FROM unnest(v) x UNION SELECT 'CT-' || x || '-O' FROM unnest(v) x);
--   DELETE FROM agrupaciones WHERE codigo_rpm IN (SELECT 'CT-' || x || '-D' FROM unnest(v) x UNION SELECT 'CT-' || x || '-O' FROM unnest(v) x);
--   DELETE FROM factores_curvas_grupos WHERE nombre = 'Traslado de carga a INDUSTRIALES';
-- END $$;
