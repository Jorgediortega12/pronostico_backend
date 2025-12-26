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
