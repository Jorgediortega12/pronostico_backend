export const guardarBarra = `
INSERT INTO barras
(barra, descripcion, nivel_tension, observaciones, habilitar, estado, mc)
VALUES ($1, $2, $3, $4, $5, 1, $6)
RETURNING *
`;

export const consultarBarrasIndex_xMC = `SELECT id, barra, descripcion, nivel_tension, observaciones, habilitar, estado, mc FROM barras WHERE mc = $1 AND estado = 1 ORDER BY id`;

export const actualizarBarra = `
UPDATE barras
SET barra = $1,
    descripcion = $2,
    nivel_tension = $3,
    observaciones = $4,
    habilitar = $5,
    mc = $6
WHERE id = $7
`;

// EPM: columnas por-agrupación para normalizar las medidas que llegan de la
// API externa (dividir /1000 y/o forzar valor absoluto). agrupaciones vive
// en la BD de cada empresa (no hay migración central), así que se aseguran
// perezosamente antes de leer/escribir.
export const asegurarColumnasEpmAgrupaciones = `
ALTER TABLE agrupaciones ADD COLUMN IF NOT EXISTS dividir_por_1000 BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE agrupaciones ADD COLUMN IF NOT EXISTS valor_absoluto BOOLEAN NOT NULL DEFAULT false;
`;

export const guardarAgrupacion = `
INSERT INTO agrupaciones
(barra_id, codigo_rpm, flujo, habilitar, revision, estado, factor, dividir_por_1000, valor_absoluto)
VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8)
RETURNING *
`;

// Un mismo codigo_rpm suele tener DOS agrupaciones (una AE para P, otra R1
// para Q) — hay que filtrar también por flujo, si no, un LIMIT 1 sin más
// trae una al azar y le aplica su config (÷1000/valor_absoluto/flujo) a
// ambos elementos indistintamente.
export const consultarAgrupacion_xCodigoRpmYFlujo = `
  SELECT flujo, dividir_por_1000, valor_absoluto FROM agrupaciones WHERE codigo_rpm = $1 AND flujo = $2 AND estado = 1 LIMIT 1
`;
export const consultarAgrupacionesIndex_xBarraId = `SELECT id, barra_id, codigo_rpm, flujo, habilitar, revision, estado, factor, dividir_por_1000, valor_absoluto FROM agrupaciones WHERE barra_id = $1 AND estado = 1 ORDER BY id`;

export const actualizarAgrupacion = `
UPDATE agrupaciones
SET barra_id = $1,
    codigo_rpm = $2,
    flujo = $3,
    habilitar = $4,
    revision = $5,
    factor = $6,
    dividir_por_1000 = $7,
    valor_absoluto = $8
WHERE id = $9
`;

// querys/barras.query.ts
export const eliminarAgrupacionesPorBarra = `
UPDATE agrupaciones
SET estado = 0
WHERE barra_id = $1
`;

export const eliminarBarra = `
UPDATE barras
SET estado = 0
WHERE id = $1
`;

export const eliminarAgrupacion = `
UPDATE agrupaciones
SET estado = 0
WHERE id = $1
`;

// DELETE
export const eliminarMedida = `
DELETE FROM medidas
WHERE flujo = $1
  AND fecha = $2
  AND codigo_rpm = $3
`;

// UPDATE
export const actualizarMedida = `
UPDATE medidas SET
  p1=$4,  p2=$5,  p3=$6,  p4=$7,  p5=$8,  p6=$9,
  p7=$10, p8=$11, p9=$12, p10=$13, p11=$14, p12=$15,
  p13=$16, p14=$17, p15=$18, p16=$19, p17=$20, p18=$21,
  p19=$22, p20=$23, p21=$24, p22=$25, p23=$26, p24=$27
WHERE flujo=$1 AND fecha=$2 AND codigo_rpm=$3
`;

// INSERT
export const insertarMedida = `
INSERT INTO medidas (
  flujo, fecha, codigo_rpm,
  p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,
  p13,p14,p15,p16,p17,p18,p19,p20,p21,p22,p23,p24,
  marcado
) VALUES (
  $1,$2,$3,
  $4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
  $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,
  0
)
ON CONFLICT (codigo_rpm, fecha, flujo) DO UPDATE SET
  p1  = EXCLUDED.p1,  p2  = EXCLUDED.p2,  p3  = EXCLUDED.p3,  p4  = EXCLUDED.p4,
  p5  = EXCLUDED.p5,  p6  = EXCLUDED.p6,  p7  = EXCLUDED.p7,  p8  = EXCLUDED.p8,
  p9  = EXCLUDED.p9,  p10 = EXCLUDED.p10, p11 = EXCLUDED.p11, p12 = EXCLUDED.p12,
  p13 = EXCLUDED.p13, p14 = EXCLUDED.p14, p15 = EXCLUDED.p15, p16 = EXCLUDED.p16,
  p17 = EXCLUDED.p17, p18 = EXCLUDED.p18, p19 = EXCLUDED.p19, p20 = EXCLUDED.p20,
  p21 = EXCLUDED.p21, p22 = EXCLUDED.p22, p23 = EXCLUDED.p23, p24 = EXCLUDED.p24
`;

/* =========================
   FECHAS INGRESADAS
   ========================= */

export const eliminarFechasIngresadasTodos = `
DELETE FROM fechas_ingresadas
WHERE ucp = $1
  AND barra IS NOT NULL
  AND tipo_dia IS NOT NULL
  AND nro_dias IS NOT NULL
`;

export const guardarRangoFecha = `
INSERT INTO fechas_ingresadas
(fechainicio, fechafin, ucp, barra, tipo_dia, nro_dias)
VALUES ($1, $2, $3, $4, $5, $6)
`;

/* =========================
   MEDIDAS
   ========================= */

export const reiniciarMedidas = `
UPDATE medidas
SET marcado = 0
`;

/* =========================
   CONSULTAS BARRAS
   ========================= */

export const consultarBarraNombre = `
SELECT a.codigo_rpm
FROM barras b
INNER JOIN agrupaciones a ON b.id = a.barra_id
WHERE b.barra = $1
  AND b.estado = 1
  AND a.estado = 1
GROUP BY a.codigo_rpm
`;

export const consultarBarraFlujoNombreInicial = `
SELECT a.flujo
FROM barras b
INNER JOIN agrupaciones a ON b.id = a.barra_id
WHERE b.barra = $1
  AND substring(a.flujo from 1 for 1) = $2
  AND b.estado = 1
  AND a.estado = 1
GROUP BY a.flujo
`;

export const consultarBarraFactorNombre = `
SELECT
  a.factor,
  a.codigo_rpm,
  a.flujo,
  a.dividir_por_1000,
  a.valor_absoluto
FROM barras b
INNER JOIN agrupaciones a ON b.id = a.barra_id
WHERE b.barra = $1
  AND a.codigo_rpm = ANY($2)
  AND substring(a.flujo from 1 for 1) = $3
  AND b.estado = 1
  AND a.estado = 1
`;

export const consultarMedidasCalcularCompleto = `
SELECT
  $7 AS BAbarra,
  ME.flujo AS MEflujo,
  TO_CHAR(ME.fecha, 'DD-MM-YYYY') AS MEfecha,
  ME.codigo_rpm AS MEcodigo_rpm,

  (
    ME.p1 + ME.p2 + ME.p3 + ME.p4 + ME.p5 + ME.p6 +
    ME.p7 + ME.p8 + ME.p9 + ME.p10 + ME.p11 + ME.p12 +
    ME.p13 + ME.p14 + ME.p15 + ME.p16 + ME.p17 + ME.p18 +
    ME.p19 + ME.p20 + ME.p21 + ME.p22 + ME.p23 + ME.p24
  ) AS MEtotal,

  ME.p1 AS MEp1, ME.p2 AS MEp2, ME.p3 AS MEp3, ME.p4 AS MEp4,
  ME.p5 AS MEp5, ME.p6 AS MEp6, ME.p7 AS MEp7, ME.p8 AS MEp8,
  ME.p9 AS MEp9, ME.p10 AS MEp10, ME.p11 AS MEp11, ME.p12 AS MEp12,
  ME.p13 AS MEp13, ME.p14 AS MEp14, ME.p15 AS MEp15, ME.p16 AS MEp16,
  ME.p17 AS MEp17, ME.p18 AS MEp18, ME.p19 AS MEp19, ME.p20 AS MEp20,
  ME.p21 AS MEp21, ME.p22 AS MEp22, ME.p23 AS MEp23, ME.p24 AS MEp24,

  ME.marcado AS MEMarcado
FROM medidas ME
WHERE ME.fecha BETWEEN $1 AND $2
  AND ME.codigo_rpm = ANY($3::varchar[])
  AND ME.flujo = ANY($4::varchar[])

  AND (
    CASE
      WHEN $5 = 'ORDINARIO' THEN
        date_part('dow', ME.fecha) IN (1,2,3,4,5)
        AND ME.fecha NOT IN (
          SELECT fecha
          FROM festivos
          WHERE ucp = $6
            AND fecha BETWEEN $1 AND $2
        )

      WHEN $5 = 'SABADO' THEN
        date_part('dow', ME.fecha) = 6

      WHEN $5 = 'FESTIVO' THEN
        date_part('dow', ME.fecha) = 0
        OR ME.fecha IN (
          SELECT fecha
          FROM festivos
          WHERE ucp = $6
            AND fecha BETWEEN $1 AND $2
        )

      ELSE false
    END
  )

  AND ($8 = false OR ME.marcado = '1')

GROUP BY
  ME.flujo, ME.fecha, ME.codigo_rpm,
  ME.p1, ME.p2, ME.p3, ME.p4, ME.p5, ME.p6,
  ME.p7, ME.p8, ME.p9, ME.p10, ME.p11, ME.p12,
  ME.p13, ME.p14, ME.p15, ME.p16, ME.p17, ME.p18,
  ME.p19, ME.p20, ME.p21, ME.p22, ME.p23, ME.p24,
  ME.marcado

ORDER BY ME.fecha ASC
`;

export const buscarUltimaFechaMedida = `SELECT * FROM medidas ORDER BY fecha DESC LIMIT 1`;

export const buscarVersionSesionFactores = `
  SELECT * FROM factores_sesiones
  WHERE nombre = $1
  ORDER BY version DESC
  LIMIT 1
`;

export const agregarSesionFactores = `
  INSERT INTO factores_sesiones (
    fecha, ucp, fecha_inicio, fecha_fin,
    usuario, nombre, version, nombrearchivo, observacion
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *
`;

export const agregarRefFactores = `
  INSERT INTO factores_sesiones_ref (
    codsesion, tipo_dia, tipo_energia,
    p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,
    p13,p14,p15,p16,p17,p18,p19,p20,p21,p22,p23,p24
  ) VALUES (
    $1,$2,$3,
    $4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
    $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
  ) RETURNING *
`;

export const agregarFactorSesion = `
  INSERT INTO factores_sesiones_factores (
    codsesion, tipo_dia, tipo_factor, barra,
    p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,
    p13,p14,p15,p16,p17,p18,p19,p20,p21,p22,p23,p24
  ) VALUES (
    $1,$2,$3,$4,
    $5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
    $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
  ) RETURNING *
`;

export const agregarArchivoSesionFactores = `
  INSERT INTO factores_sesiones_archivos (codsesion, codarchivo, tipo)
  VALUES ($1, $2, $3)
  RETURNING *
`;

// queries SQL
export const buscarSesionPorArchivo = `
  SELECT s.*
  FROM factores_sesiones s
  JOIN factores_sesiones_archivos a ON a.codsesion = s.codigo
  WHERE a.codigo = $1
  LIMIT 1
`;

export const buscarRefPorSesion = `
  SELECT * FROM factores_sesiones_ref
  WHERE codsesion = $1
`;

export const buscarFactoresPorSesion = `
  SELECT * FROM factores_sesiones_factores
  WHERE codsesion = $1
`;

export const cargarArchivoVrSesionesFactores = `
  SELECT 
    s.codigo, 
    CONCAT_WS('', s.nombre, ' v', s.version) AS nombre 
  FROM archivos a 
  INNER JOIN factores_sesiones s 
    ON s.nombrearchivo = a.nombrearchivo 
  WHERE a.codcarpeta = $1
  GROUP BY 
    s.codigo, 
    s.nombre, 
    s.version 
  ORDER BY 
    s.nombre, 
    s.version ASC
`;

// Última sesión de factores para un UCP
export const getUltimaSesionPorUcp = `
  SELECT s.*
  FROM factores_sesiones s
  WHERE s.ucp = $1
  ORDER BY s.fecha DESC, s.version DESC
  LIMIT 1
`;

// Factores FDA/FDP de una sesión (todas las barras y tipos de día)
export const getFactoresPorSesion = `
  SELECT 
    codsesion, tipo_dia, tipo_factor AS tipo, barra,
    p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,
    p13,p14,p15,p16,p17,p18,p19,p20,p21,p22,p23,p24
  FROM factores_sesiones_factores
  WHERE codsesion = $1
`;

// Obtener sesión vigente por UCP
export const getSessionVigentePorUcp = `
  SELECT s.*
  FROM factores_sesiones s
  WHERE s.ucp = $1 AND s.vigente = TRUE
  LIMIT 1
`;

// Marcar una sesión como vigente (desactiva las demás del mismo UCP primero)
export const desactivarVigentesPorUcp = `
  UPDATE factores_sesiones
  SET vigente = FALSE
  WHERE ucp = $1
`;

export const marcarSesionVigente = `
  UPDATE factores_sesiones
  SET vigente = TRUE
  WHERE codigo = $1
  RETURNING *
`;

/* =========================
   COBERTURA DE DEMANDA
   (demanda oficial vs suma de barras, para detectar circuitos sin
   medida o en cero — ver factor='-1' fix de agrupaciones)
   ========================= */

// factor es varchar en agrupaciones -> ::numeric obligatorio al sumar.
const SUMA_24_PERIODOS_ME = `(COALESCE(me.p1,0)+COALESCE(me.p2,0)+COALESCE(me.p3,0)+COALESCE(me.p4,0)+COALESCE(me.p5,0)+COALESCE(me.p6,0)+COALESCE(me.p7,0)+COALESCE(me.p8,0)+COALESCE(me.p9,0)+COALESCE(me.p10,0)+COALESCE(me.p11,0)+COALESCE(me.p12,0)+COALESCE(me.p13,0)+COALESCE(me.p14,0)+COALESCE(me.p15,0)+COALESCE(me.p16,0)+COALESCE(me.p17,0)+COALESCE(me.p18,0)+COALESCE(me.p19,0)+COALESCE(me.p20,0)+COALESCE(me.p21,0)+COALESCE(me.p22,0)+COALESCE(me.p23,0)+COALESCE(me.p24,0))`;

// Aplica dividir_por_1000 -> factor -> valor_absoluto (en ese orden) a UNA
// columna de periodo, igual que aplicarConfigAgrupacion en JS/Python — acá
// hace falta repetirlo en SQL puro porque estas queries suman en la propia
// base de datos. valor_absoluto se aplica por periodo, no sobre la suma ya
// hecha (abs(suma) no es lo mismo que suma(abs) si los periodos de una
// misma fila tuvieran signos distintos entre sí).
const expresionPeriodoConFactor = (colPeriodo) => {
  const escalado = `(CASE WHEN a.dividir_por_1000 THEN COALESCE(${colPeriodo},0)/1000 ELSE COALESCE(${colPeriodo},0) END)`;
  const conFactor = `(${escalado} * a.factor::numeric)`;
  return `(CASE WHEN a.valor_absoluto THEN ABS(${conFactor}) ELSE ${conFactor} END)`;
};

// Suma de los 24 periodos de una fila, cada uno ya pasado por
// expresionPeriodoConFactor — para usar dentro de un SUM(...) que agrega
// por filas/fechas.
const SUMA_24_PERIODOS_ME_CON_FACTOR = Array.from({ length: 24 }, (_, i) =>
  expresionPeriodoConFactor(`me.p${i + 1}`),
).join("+");

const SUMA_24_PERIODOS_AD = `(COALESCE(ad.p1,0)+COALESCE(ad.p2,0)+COALESCE(ad.p3,0)+COALESCE(ad.p4,0)+COALESCE(ad.p5,0)+COALESCE(ad.p6,0)+COALESCE(ad.p7,0)+COALESCE(ad.p8,0)+COALESCE(ad.p9,0)+COALESCE(ad.p10,0)+COALESCE(ad.p11,0)+COALESCE(ad.p12,0)+COALESCE(ad.p13,0)+COALESCE(ad.p14,0)+COALESCE(ad.p15,0)+COALESCE(ad.p16,0)+COALESCE(ad.p17,0)+COALESCE(ad.p18,0)+COALESCE(ad.p19,0)+COALESCE(ad.p20,0)+COALESCE(ad.p21,0)+COALESCE(ad.p22,0)+COALESCE(ad.p23,0)+COALESCE(ad.p24,0))`;

// Por fecha en el rango: demanda oficial (actualizaciondatos, ancla del
// LEFT JOIN) vs suma de barras (medidas.pN * factor, flujo AE, barra
// habilitada, agrupación activa). COALESCE a 0 si una fecha oficial no
// tiene ninguna fila de barras ese día (hueco total).
export const consultarCoberturaDemanda_xMCyRangoFecha = `
WITH suma_barras_dia AS (
  SELECT
    me.fecha::date AS fecha,
    SUM(${SUMA_24_PERIODOS_ME_CON_FACTOR}) AS suma_barras
  FROM medidas me
  INNER JOIN agrupaciones a
    ON a.codigo_rpm = me.codigo_rpm
    AND a.flujo = me.flujo
    AND a.estado = 1
  INNER JOIN barras b
    ON b.id = a.barra_id
    AND b.estado = 1
    AND b.habilitar = 1
  WHERE b.mc = $1
    AND me.flujo = 'AE'
    AND me.fecha BETWEEN $2::date AND $3::date
  GROUP BY me.fecha
)
SELECT
  TO_CHAR(ad.fecha, 'YYYY-MM-DD') AS fecha,
  ${SUMA_24_PERIODOS_AD} AS demanda_oficial,
  COALESCE(sbd.suma_barras, 0) AS suma_barras,
  CASE
    WHEN ${SUMA_24_PERIODOS_AD} = 0 THEN NULL
    ELSE ROUND(((COALESCE(sbd.suma_barras, 0) / ${SUMA_24_PERIODOS_AD}) * 100)::numeric, 2)
  END AS cobertura_pct
FROM actualizaciondatos ad
LEFT JOIN suma_barras_dia sbd ON sbd.fecha = ad.fecha::date
WHERE LOWER(ad.ucp) = LOWER($1)
  AND ad.fecha BETWEEN $2::date AND $3::date
ORDER BY ad.fecha ASC
`;

// Barras/agrupaciones AE activas de un mercado que NO tienen ninguna fila
// en medidas para la fecha dada (circuito que nunca reportó ese día).
export const consultarBarrasSinMedida_xMCyFecha = `
SELECT
  b.barra,
  a.codigo_rpm
FROM barras b
INNER JOIN agrupaciones a
  ON a.barra_id = b.id
  AND a.estado = 1
  AND a.flujo = 'AE'
WHERE b.mc = $1
  AND b.estado = 1
  AND b.habilitar = 1
  AND NOT EXISTS (
    SELECT 1
    FROM medidas me
    WHERE me.codigo_rpm = a.codigo_rpm
      AND me.flujo = 'AE'
      AND me.fecha = $2::date
  )
ORDER BY b.barra ASC
`;

// Desglose de demanda por barra para una fecha puntual (drill-down). INNER
// JOIN contra medidas: una barra sin ninguna fila ese día no aparece aquí
// (ver consultarBarrasSinMedida_xMCyFecha); una barra con fila pero en
// cero SÍ aparece, con total ≈ 0 — esa es la señal de "reportó pero en
// cero".
export const consultarDemandaPorBarra_xMCyFecha = `
SELECT
  b.barra,
  SUM(${SUMA_24_PERIODOS_ME_CON_FACTOR}) AS total,
  SUM(${expresionPeriodoConFactor("me.p1")})  AS p1,
  SUM(${expresionPeriodoConFactor("me.p2")})  AS p2,
  SUM(${expresionPeriodoConFactor("me.p3")})  AS p3,
  SUM(${expresionPeriodoConFactor("me.p4")})  AS p4,
  SUM(${expresionPeriodoConFactor("me.p5")})  AS p5,
  SUM(${expresionPeriodoConFactor("me.p6")})  AS p6,
  SUM(${expresionPeriodoConFactor("me.p7")})  AS p7,
  SUM(${expresionPeriodoConFactor("me.p8")})  AS p8,
  SUM(${expresionPeriodoConFactor("me.p9")})  AS p9,
  SUM(${expresionPeriodoConFactor("me.p10")}) AS p10,
  SUM(${expresionPeriodoConFactor("me.p11")}) AS p11,
  SUM(${expresionPeriodoConFactor("me.p12")}) AS p12,
  SUM(${expresionPeriodoConFactor("me.p13")}) AS p13,
  SUM(${expresionPeriodoConFactor("me.p14")}) AS p14,
  SUM(${expresionPeriodoConFactor("me.p15")}) AS p15,
  SUM(${expresionPeriodoConFactor("me.p16")}) AS p16,
  SUM(${expresionPeriodoConFactor("me.p17")}) AS p17,
  SUM(${expresionPeriodoConFactor("me.p18")}) AS p18,
  SUM(${expresionPeriodoConFactor("me.p19")}) AS p19,
  SUM(${expresionPeriodoConFactor("me.p20")}) AS p20,
  SUM(${expresionPeriodoConFactor("me.p21")}) AS p21,
  SUM(${expresionPeriodoConFactor("me.p22")}) AS p22,
  SUM(${expresionPeriodoConFactor("me.p23")}) AS p23,
  SUM(${expresionPeriodoConFactor("me.p24")}) AS p24
FROM barras b
INNER JOIN agrupaciones a
  ON a.barra_id = b.id
  AND a.estado = 1
  AND a.flujo = 'AE'
INNER JOIN medidas me
  ON me.codigo_rpm = a.codigo_rpm
  AND me.flujo = a.flujo
  AND me.fecha = $2::date
WHERE b.mc = $1
  AND b.estado = 1
  AND b.habilitar = 1
GROUP BY b.barra
ORDER BY b.barra ASC
`;
