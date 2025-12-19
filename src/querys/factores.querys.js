export const guardarBarra = `
INSERT INTO barras
(barra, descripcion, nivel_tension, observaciones, habilitar, estado, mc)
VALUES ($1, $2, $3, $4, $5, 1, $6)
RETURNING id
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
RETURNING id
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
