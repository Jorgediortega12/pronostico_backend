// Módulo "Medidas Factores": visualización paginada/filtrada de la tabla
// `medidas` (muchísimas filas), cruzada con `agrupaciones` (codigo_rpm +
// flujo -> barra_id) y `barras` (id -> mc/UCP). Mismo cruce que ya usa
// factores.querys.js (consultarBarraNombre, etc.), pero con LIMIT/OFFSET
// server-side en vez de traer todo — el filtro por mc/UCP es obligatorio.

const FILTROS_WHERE = `
  WHERE b.mc = $1
    AND ($2::int IS NULL OR b.id = $2)
    AND ($3::text IS NULL OR me.codigo_rpm = $3)
    AND ($4::text IS NULL OR me.flujo = $4)
    AND ($5::date IS NULL OR me.fecha >= $5::date)
    AND ($6::date IS NULL OR me.fecha <= $6::date)
`;

// Columnas por las que se puede ordenar la tabla desde el frontend (headers
// clicables). Whitelist explícita — nunca se interpola el sortBy del
// usuario directamente en el SQL, sólo uno de estos valores fijos.
const COLUMNAS_ORDENABLES = {
  fecha: "me.fecha",
  codigo_rpm: "me.codigo_rpm",
  flujo: "me.flujo",
  barra: "b.barra",
};

// Arma la cláusula ORDER BY de forma segura (whitelist) + desempate estable
// para que la paginación no repita/salte filas entre páginas.
export function construirOrderBy(sortBy, sortDir) {
  const columna = COLUMNAS_ORDENABLES[sortBy] ?? COLUMNAS_ORDENABLES.fecha;
  const direccion = sortDir === "asc" ? "ASC" : "DESC";
  const desempate =
    columna === COLUMNAS_ORDENABLES.fecha
      ? "me.codigo_rpm ASC, me.flujo ASC"
      : "me.fecha DESC, me.codigo_rpm ASC, me.flujo ASC";
  return `${columna} ${direccion}, ${desempate}`;
}

export function listarMedidas(orderBy) {
  return `
SELECT
  me.flujo,
  me.fecha,
  me.codigo_rpm,
  me.marcado,
  me.p1, me.p2, me.p3, me.p4, me.p5, me.p6,
  me.p7, me.p8, me.p9, me.p10, me.p11, me.p12,
  me.p13, me.p14, me.p15, me.p16, me.p17, me.p18,
  me.p19, me.p20, me.p21, me.p22, me.p23, me.p24,
  b.id AS barra_id,
  b.barra,
  a.id AS agrupacion_id,
  a.revision,
  a.factor
FROM medidas me
INNER JOIN agrupaciones a
  ON a.codigo_rpm = me.codigo_rpm
  AND a.flujo = me.flujo
  AND a.estado = 1
INNER JOIN barras b
  ON b.id = a.barra_id
  AND b.estado = 1
${FILTROS_WHERE}
ORDER BY ${orderBy}
LIMIT $7 OFFSET $8
`;
}

export const contarMedidas = `
SELECT COUNT(*) AS total
FROM medidas me
INNER JOIN agrupaciones a
  ON a.codigo_rpm = me.codigo_rpm
  AND a.flujo = me.flujo
  AND a.estado = 1
INNER JOIN barras b
  ON b.id = a.barra_id
  AND b.estado = 1
${FILTROS_WHERE}
`;

/* =========================================================================
   INVERTIR SIGNO: sólo sobre las filas que YA tienen al menos un periodo
   negativo (mismo criterio que la consulta de diagnóstico que se usaba a
   mano), acotado siempre a un rango de fechas (obligatorio) y, si se
   quiere, a una barra/agrupación/flujo puntual. Multiplicar por -1 invierte
   negativo→positivo y positivo→negativo por igual (es la misma operación).
   ========================================================================= */

const CONDICION_ALGUN_PERIODO_NEGATIVO = `
  AND (
    me.p1 < 0 OR me.p2 < 0 OR me.p3 < 0 OR me.p4 < 0 OR
    me.p5 < 0 OR me.p6 < 0 OR me.p7 < 0 OR me.p8 < 0 OR
    me.p9 < 0 OR me.p10 < 0 OR me.p11 < 0 OR me.p12 < 0 OR
    me.p13 < 0 OR me.p14 < 0 OR me.p15 < 0 OR me.p16 < 0 OR
    me.p17 < 0 OR me.p18 < 0 OR me.p19 < 0 OR me.p20 < 0 OR
    me.p21 < 0 OR me.p22 < 0 OR me.p23 < 0 OR me.p24 < 0
  )
`;

// fecha_inicio/fecha_fin son obligatorios aquí (no se permite invertir todo
// el histórico por accidente) — barraId/codigoRpm/flujo son opcionales.
const FILTROS_WHERE_INVERSION = `
  WHERE b.mc = $1
    AND me.fecha >= $2::date
    AND me.fecha <= $3::date
    AND ($4::int IS NULL OR b.id = $4)
    AND ($5::text IS NULL OR me.codigo_rpm = $5)
    AND ($6::text IS NULL OR me.flujo = $6)
  ${CONDICION_ALGUN_PERIODO_NEGATIVO}
`;

// COUNT(DISTINCT (codigo_rpm, fecha, flujo)) — no COUNT(*) — porque un mismo
// medida puede quedar unido a más de una agrupación/barra a la vez (un
// codigo_rpm+flujo puede pertenecer legítimamente a dos barras con factor
// distinto, ej. NvSRosa110kVswTrafo2/AE -> NSROSA11 factor -1 y NSN_ROSA
// factor 1). Con COUNT(*) esa fila se cuenta dos veces aunque el UPDATE
// sólo la toque una vez (es una sola fila física en `medidas`) — hay que
// contar lo mismo que se va a actualizar, no el producto del join.
export const contarSignoNegativo = `
SELECT
  COUNT(DISTINCT (me.codigo_rpm, me.fecha, me.flujo)) AS total,
  COUNT(DISTINCT me.fecha) AS fechas
FROM medidas me
INNER JOIN agrupaciones a
  ON a.codigo_rpm = me.codigo_rpm
  AND a.flujo = me.flujo
  AND a.estado = 1
INNER JOIN barras b
  ON b.id = a.barra_id
  AND b.estado = 1
${FILTROS_WHERE_INVERSION}
`;

// UPDATE ... FROM: el join va en el FROM/WHERE, no se puede usar INNER JOIN
// directo sobre la tabla que se actualiza.
export const invertirSignoNegativo = `
UPDATE medidas me
SET
  p1 = -me.p1,  p2 = -me.p2,   p3 = -me.p3,   p4 = -me.p4,
  p5 = -me.p5,  p6 = -me.p6,   p7 = -me.p7,   p8 = -me.p8,
  p9 = -me.p9,  p10 = -me.p10, p11 = -me.p11, p12 = -me.p12,
  p13 = -me.p13, p14 = -me.p14, p15 = -me.p15, p16 = -me.p16,
  p17 = -me.p17, p18 = -me.p18, p19 = -me.p19, p20 = -me.p20,
  p21 = -me.p21, p22 = -me.p22, p23 = -me.p23, p24 = -me.p24
FROM agrupaciones a, barras b
${FILTROS_WHERE_INVERSION.replace("WHERE", "WHERE a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo AND a.estado = 1 AND b.id = a.barra_id AND b.estado = 1 AND")}
RETURNING me.fecha, me.codigo_rpm, me.flujo
`;
