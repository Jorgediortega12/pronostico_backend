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

export const guardarAgrupacion = `
INSERT INTO agrupaciones
(barra_id, codigo_rpm, flujo, habilitar, revision, estado, factor)
VALUES ($1, $2, $3, $4, $5, 1, $6)
RETURNING *
`;

export const consultarAgrupacionesIndex_xBarraId = `SELECT id, barra_id, codigo_rpm, flujo, habilitar, revision, estado, factor FROM agrupaciones WHERE barra_id = $1 AND estado = 1 ORDER BY id`;

export const actualizarAgrupacion = `
UPDATE agrupaciones
SET barra_id = $1,
    codigo_rpm = $2,
    flujo = $3,
    habilitar = $4,
    revision = $5,
    factor = $6
WHERE id = $7
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
  a.flujo
FROM barras b
INNER JOIN agrupaciones a ON b.id = a.barra_id
WHERE b.barra = $1
  AND a.codigo_rpm = ANY($2)
  AND substring(a.flujo from 1 for 1) = $3
  AND b.estado = 1
  AND a.estado = 1
`;

// export const consultarMedidasCalcularCompleto = `
// SELECT
//   $7 AS BAbarra,
//   ME.flujo AS MEflujo,
//   TO_CHAR(ME.fecha, 'DD-MM-YYYY') AS MEfecha,
//   ME.codigo_rpm AS MEcodigo_rpm,
//   (
//     ME.p1 + ME.p2 + ME.p3 + ME.p4 + ME.p5 + ME.p6 +
//     ME.p7 + ME.p8 + ME.p9 + ME.p10 + ME.p11 + ME.p12 +
//     ME.p13 + ME.p14 + ME.p15 + ME.p16 + ME.p17 + ME.p18 +
//     ME.p19 + ME.p20 + ME.p21 + ME.p22 + ME.p23 + ME.p24
//   ) AS MEtotal,
//   ME.p1 AS MEp1, ME.p2 AS MEp2, ME.p3 AS MEp3, ME.p4 AS MEp4,
//   ME.p5 AS MEp5, ME.p6 AS MEp6, ME.p7 AS MEp7, ME.p8 AS MEp8,
//   ME.p9 AS MEp9, ME.p10 AS MEp10, ME.p11 AS MEp11, ME.p12 AS MEp12,
//   ME.p13 AS MEp13, ME.p14 AS MEp14, ME.p15 AS MEp15, ME.p16 AS MEp16,
//   ME.p17 AS MEp17, ME.p18 AS MEp18, ME.p19 AS MEp19, ME.p20 AS MEp20,
//   ME.p21 AS MEp21, ME.p22 AS MEp22, ME.p23 AS MEp23, ME.p24 AS MEp24,
//   ME.marcado AS MEMarcado
// FROM medidas ME
// WHERE ME.fecha BETWEEN $1 AND $2
//     AND ME.codigo_rpm = ANY($3::varchar[])
//     AND ME.flujo = ANY($4::varchar[])
//   AND (
//     ($5 = 'ORDINARIO' AND
//       date_part('dow', ME.fecha) IN (1,2,3,4,5)
//       AND ME.fecha NOT IN (
//         SELECT fecha FROM festivos
//         WHERE ucp = $6 AND fecha BETWEEN $1 AND $2
//       )
//     )
//     OR ($5 = 'SABADO' AND date_part('dow', ME.fecha) = 6)
//     OR ($5 = 'FESTIVO' AND (
//         date_part('dow', ME.fecha) = 0
//         OR ME.fecha IN (
//           SELECT fecha FROM festivos
//           WHERE ucp = $6 AND fecha BETWEEN $1 AND $2
//         )
//     ))
//   )
//   AND ($8 = false OR ME.marcado = '1')
// GROUP BY
//   ME.flujo, ME.fecha, ME.codigo_rpm,
//   ME.p1, ME.p2, ME.p3, ME.p4, ME.p5, ME.p6,
//   ME.p7, ME.p8, ME.p9, ME.p10, ME.p11, ME.p12,
//   ME.p13, ME.p14, ME.p15, ME.p16, ME.p17, ME.p18,
//   ME.p19, ME.p20, ME.p21, ME.p22, ME.p23, ME.p24,
//   ME.marcado
// ORDER BY ME.fecha ASC
// `;

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
