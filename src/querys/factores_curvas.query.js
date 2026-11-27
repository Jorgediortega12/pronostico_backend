// Consultas de las curvas típicas cargadas (Factores de distribución). Los valores siempre van como parámetros ($n).
// La explicación del diseño está en src/utils/factoresCurvas.js.

const P = Array.from({ length: 24 }, (_, i) => `p${i + 1}`);
const COLUMNAS_P = P.join(", ");

// Tablas propias del módulo. Viven en la base de cada empresa y no hay migración central: se aseguran perezosamente (una vez por proceso),
// igual que factores_fp_minimo.
export const asegurarTablas = `
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
  ${P.map((p) => `${p} DOUBLE PRECISION NOT NULL DEFAULT 0`).join(",\n  ")},
  PRIMARY KEY (componente_id, tipo_dia, dato)
);
CREATE INDEX IF NOT EXISTS idx_factores_curvas_grupos_mc ON factores_curvas_grupos (mc);
CREATE INDEX IF NOT EXISTS idx_factores_curvas_componentes_grupo ON factores_curvas_componentes (grupo_id);
`;

// ── Barras ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const barraPorNombre = `SELECT id, barra, descripcion, mc, habilitar, estado FROM barras WHERE barra = $1 AND mc = $2 AND estado = 1 LIMIT 1`;
export const barraPorId = `SELECT id, barra, descripcion, mc, habilitar, estado FROM barras WHERE id = $1`;
export const barrasPorIds = `SELECT id, barra FROM barras WHERE id = ANY($1::int[])`;
export const crearBarra = `
INSERT INTO barras (barra, descripcion, nivel_tension, observaciones, habilitar, estado, mc)
VALUES ($1, $2, $3, $4, 1, 1, $5)
RETURNING id, barra, descripcion, mc, habilitar, estado`;

// ── Grupos y componentes ──────────────────────────────────────────────────────────────────────────────────────────────────
export const listarGrupos = `
SELECT g.id, g.mc, g.nombre, g.destino_barra_id, d.barra AS destino, g.descontar, g.habilitar,
       to_char(g.vigente_desde, 'YYYY-MM-DD') AS vigente_desde, to_char(g.vigente_hasta, 'YYYY-MM-DD') AS vigente_hasta,
       g.observaciones, g.creado_en, g.actualizado_en
FROM factores_curvas_grupos g
LEFT JOIN barras d ON d.id = g.destino_barra_id
WHERE g.mc = $1
ORDER BY g.id`;

export const grupoPorId = `
SELECT g.id, g.mc, g.nombre, g.destino_barra_id, d.barra AS destino, g.descontar, g.habilitar,
       to_char(g.vigente_desde, 'YYYY-MM-DD') AS vigente_desde, to_char(g.vigente_hasta, 'YYYY-MM-DD') AS vigente_hasta,
       g.observaciones, g.creado_en, g.actualizado_en
FROM factores_curvas_grupos g
LEFT JOIN barras d ON d.id = g.destino_barra_id
WHERE g.id = $1`;

export const componentesDeGrupos = `
SELECT c.id, c.grupo_id, c.origen_barra_id, o.barra AS origen, c.unidad, c.fp_modo, c.fp_valor::float AS fp_valor,
       c.fp_barra_id, fb.barra AS fp_barra, to_char(c.fp_desde, 'YYYY-MM-DD') AS fp_desde, to_char(c.fp_hasta, 'YYYY-MM-DD') AS fp_hasta
FROM factores_curvas_componentes c
LEFT JOIN barras o ON o.id = c.origen_barra_id
LEFT JOIN barras fb ON fb.id = c.fp_barra_id
WHERE c.grupo_id = ANY($1::int[])
ORDER BY c.id`;

export const valoresDeComponentes = `
SELECT componente_id, tipo_dia, dato, ${COLUMNAS_P}
FROM factores_curvas_valores
WHERE componente_id = ANY($1::int[])
ORDER BY componente_id, tipo_dia, dato`;

export const insertarGrupo = `
INSERT INTO factores_curvas_grupos (mc, nombre, destino_barra_id, descontar, habilitar, vigente_desde, vigente_hasta, observaciones)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id`;

export const actualizarGrupo = `
UPDATE factores_curvas_grupos
SET nombre = $2, destino_barra_id = $3, descontar = $4, habilitar = $5, vigente_desde = $6, vigente_hasta = $7,
    observaciones = $8, actualizado_en = NOW()
WHERE id = $1`;

export const cambiarHabilitarGrupo = `UPDATE factores_curvas_grupos SET habilitar = $2, actualizado_en = NOW() WHERE id = $1`;
export const eliminarGrupo = `DELETE FROM factores_curvas_grupos WHERE id = $1`;
export const idsDeComponentesDeGrupo = `SELECT id FROM factores_curvas_componentes WHERE grupo_id = $1`;
export const borrarComponentesDeGrupo = `DELETE FROM factores_curvas_componentes WHERE grupo_id = $1`;

export const insertarComponente = `
INSERT INTO factores_curvas_componentes (grupo_id, origen_barra_id, unidad, fp_modo, fp_valor, fp_barra_id, fp_desde, fp_hasta)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id`;

export const insertarValores = `
INSERT INTO factores_curvas_valores (componente_id, tipo_dia, dato, ${COLUMNAS_P})
VALUES ($1, $2, $3, ${P.map((_, i) => `$${i + 4}`).join(", ")})`;

/** ¿Hay un grupo (distinto del indicado) que ya aplica a esa barra destino con el mismo origen? Evita sumar dos veces la misma carga. */
export const origenesDuplicados = `
SELECT g.id, g.nombre, o.barra AS origen
FROM factores_curvas_grupos g
JOIN factores_curvas_componentes c ON c.grupo_id = g.id
LEFT JOIN barras o ON o.id = c.origen_barra_id
WHERE g.mc = $1 AND g.destino_barra_id = $2 AND g.habilitar = 1 AND g.id <> $3 AND c.origen_barra_id = ANY($4::int[])`;

// ── Materialización: agrupaciones y medidas con códigos reservados ───────────────────────────────────────────────────────
/** Idempotente: si la agrupación del código ya existe se corrige y se reactiva; si no, se crea. */
export const actualizarAgrupacionCurva = `
UPDATE agrupaciones SET barra_id = $1, factor = $4, estado = 1, habilitar = 1, revision = 'CURVA CARGADA', dividir_por_1000 = false, valor_absoluto = false
WHERE codigo_rpm = $2 AND flujo = $3`;
export const insertarAgrupacionCurva = `
INSERT INTO agrupaciones (barra_id, codigo_rpm, flujo, habilitar, revision, estado, factor, dividir_por_1000, valor_absoluto)
VALUES ($1, $2, $3, 1, 'CURVA CARGADA', 1, $4, false, false)`;

/** Grupos que usan una barra como destino o como origen (para no borrar una barra con curvas). */
export const gruposQueUsanBarra = `
SELECT DISTINCT g.id, g.nombre
FROM factores_curvas_grupos g
LEFT JOIN factores_curvas_componentes c ON c.grupo_id = g.id
WHERE g.destino_barra_id = $1 OR c.origen_barra_id = $1`;

/** La agrupación (por id): para impedir que se edite a mano si es de una curva cargada. */
export const agrupacionPorId = `SELECT id, barra_id, codigo_rpm, flujo FROM agrupaciones WHERE id = $1`;

export const borrarAgrupacionesDeCodigos = `DELETE FROM agrupaciones WHERE codigo_rpm = ANY($1::varchar[])`;
export const borrarMedidasDeCodigos = `DELETE FROM medidas WHERE codigo_rpm = ANY($1::varchar[])`;

/**
 * Inserta las medidas de una curva (un código, un flujo, un dato P o Q) en cada fecha del calendario del mercado que cae en su vigencia,
 * con los valores de su tipo de día. Calendario = fechas con alguna medida REAL (no CT-) de las barras del mercado. Un tipo de día por fecha:
 * festivo del mercado o domingo -> FESTIVO; sábado -> SABADO; el resto ORDINARIO (misma regla que las consultas de medidas).
 *   $1 mc  $2 flujo  $3 desde (rango pedido)  $4 hasta  $5 vigente_desde  $6 vigente_hasta  $7 codigo  $8 componente  $9 dato (P|Q)
 * Con `sobrescribir` las filas existentes se actualizan; si no, solo se agregan las que faltan.
 */
export const materializarMedidas = (sobrescribir) => `
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
INSERT INTO medidas (flujo, fecha, codigo_rpm, ${COLUMNAS_P}, marcado)
SELECT $2, t.fecha, $7, ${P.map((p) => `v.${p}`).join(", ")}, '0'
FROM tipos t
JOIN factores_curvas_valores v ON v.componente_id = $8::int AND v.tipo_dia = t.tipo_dia AND v.dato = $9
ON CONFLICT (codigo_rpm, fecha, flujo) ${
  sobrescribir ? `DO UPDATE SET ${P.map((p) => `${p} = EXCLUDED.${p}`).join(", ")}` : "DO NOTHING"
}`;

/** Códigos de curva (CT-) que deberían existir hoy: de los grupos habilitados. Para completar fechas nuevas. */
export const codigosActivos = `
SELECT c.id AS componente_id, g.destino_barra_id, c.origen_barra_id, g.descontar,
       to_char(g.vigente_desde, 'YYYY-MM-DD') AS vigente_desde, to_char(g.vigente_hasta, 'YYYY-MM-DD') AS vigente_hasta
FROM factores_curvas_grupos g
JOIN factores_curvas_componentes c ON c.grupo_id = g.id
WHERE g.mc = $1 AND g.habilitar = 1`;

/** Cantidad de fechas del calendario del mercado sin fila para un código (para saber si hace falta completar). */
export const fechasFaltantes = `
WITH calendario AS (
  SELECT DISTINCT me.fecha
  FROM medidas me
  JOIN agrupaciones a ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo AND a.estado = 1
  JOIN barras b ON b.id = a.barra_id
  WHERE b.mc = $1 AND me.codigo_rpm NOT LIKE 'CT-%'
    AND me.fecha >= $2::date AND me.fecha <= $3::date
    AND ($5::date IS NULL OR me.fecha >= $5::date) AND ($6::date IS NULL OR me.fecha <= $6::date)
)
SELECT count(*)::int AS faltan
FROM calendario c
WHERE NOT EXISTS (SELECT 1 FROM medidas m WHERE m.codigo_rpm = $4 AND m.fecha = c.fecha AND m.flujo = 'AE')`;

export const ultimaFechaDelMercado = `
SELECT to_char(max(me.fecha), 'YYYY-MM-DD') AS fecha
FROM medidas me
JOIN agrupaciones a ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo AND a.estado = 1
JOIN barras b ON b.id = a.barra_id
WHERE b.mc = $1 AND me.codigo_rpm NOT LIKE 'CT-%'`;

// ── Factor de potencia histórico de una barra ────────────────────────────────────────────────────────────────────────────
// Misma conversión que el resto del módulo: dividir_por_1000 -> factor -> valor_absoluto, por periodo. Solo medidas reales
// (sin CT-), y solo días con activa completa (los 24 periodos > 0). Promedia P y Q por tipo de día.
const periodoConFactor = (col) => {
  const escalado = `(CASE WHEN a.dividir_por_1000 THEN COALESCE(me.${col},0)/1000 ELSE COALESCE(me.${col},0) END)`;
  const conFactor = `(${escalado} * a.factor::numeric)`;
  return `(CASE WHEN a.valor_absoluto THEN ABS(${conFactor}) ELSE ${conFactor} END)`;
};

/** $1 barra_id  $2 desde  $3 hasta  $4 mc. Devuelve, por tipo de día y energía (A/R), cuántos días y el promedio de cada periodo. */
export const promedioPorTipoDia = `
WITH base AS (
  SELECT me.fecha, substring(me.flujo from 1 for 1) AS energia,
         ${P.map((p) => `SUM(${periodoConFactor(p)}) AS ${p}`).join(",\n         ")}
  FROM medidas me
  JOIN agrupaciones a ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo AND a.estado = 1
  WHERE a.barra_id = $1 AND me.codigo_rpm NOT LIKE 'CT-%'
    AND me.fecha >= $2::date AND me.fecha <= $3::date
    AND substring(me.flujo from 1 for 1) IN ('A', 'R')
  GROUP BY me.fecha, energia
), validas AS (
  SELECT fecha FROM base WHERE energia = 'A' AND LEAST(${P.join(", ")}) > 0
), dias AS (
  SELECT b.*,
         CASE WHEN EXISTS (SELECT 1 FROM festivos f WHERE f.ucp = $4 AND f.fecha = b.fecha) OR date_part('dow', b.fecha) = 0 THEN 'FESTIVO'
              WHEN date_part('dow', b.fecha) = 6 THEN 'SABADO'
              ELSE 'ORDINARIO' END AS tipo_dia
  FROM base b JOIN validas v ON v.fecha = b.fecha
)
SELECT tipo_dia, energia, count(*)::int AS dias, ${P.map((p) => `AVG(${p})::float AS ${p}`).join(", ")}
FROM dias
GROUP BY tipo_dia, energia`;
