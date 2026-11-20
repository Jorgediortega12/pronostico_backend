// Consultas de solo lectura de la Mesa de ajustes (BD del mercado, vía createConectionPG(session)).
// Las fechas se devuelven como texto YYYY-MM-DD (to_char) para evitar desfases de zona horaria.

const PERIODOS = Array.from({ length: 24 }, (_, i) => `p${i + 1}`).join(", ");

// Última sesión guardada (versión más reciente) cuyo rango cruza la semana y que trae filas P/PM en ella.
export const sesionEmitida = `
SELECT s.codigo, s.nombre, s.version, s.observacion,
       to_char(s.fecha, 'YYYY-MM-DD') AS fecha_sesion
FROM sesiones s
WHERE LOWER(s.ucp) = LOWER($1)
  AND s.fechainicio <= $3
  AND s.fechafin >= $2
  AND EXISTS (
    SELECT 1 FROM sesiones_periodos sp
    WHERE sp.codsesion = s.codigo
      AND sp.tipo IN ('P', 'PM')
      AND sp.fecha BETWEEN $2 AND $3
  )
ORDER BY s.fecha DESC, s.version DESC
LIMIT 1
`;

export const periodosSesionPM = `
SELECT to_char(sp.fecha, 'YYYY-MM-DD') AS fecha, sp.tipo, ${PERIODOS}
FROM sesiones_periodos sp
WHERE sp.codsesion = $1
  AND sp.tipo IN ('P', 'PM')
  AND sp.fecha BETWEEN $2 AND $3
ORDER BY sp.fecha ASC
`;

// Último día con demanda real COMPLETA estrictamente ANTERIOR a una fecha (la emisión; corte = emisión - 1, como EPM): solo cuentan días con los 24 periodos
// presentes y >= 0, igual que el corte de EPM (data.filas_validas / calcular_fecha_corte). Es la consulta más
// conservadora: usa solo `fecha` y p1..p24 (ya usadas por `reales`); no verificada contra la BD real.
export const ultimoRealHasta = `
SELECT to_char(MAX(fecha), 'YYYY-MM-DD') AS fecha
FROM actualizaciondatos
WHERE LOWER(ucp) = LOWER($1)
  AND fecha < $2
  AND ${Array.from({ length: 24 }, (_, i) => `p${i + 1} >= 0`).join("\n  AND ")}
`;

export const reales = `
SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, ${PERIODOS}
FROM actualizaciondatos
WHERE LOWER(ucp) = LOWER($1)
  AND fecha BETWEEN $2 AND $3
ORDER BY fecha ASC
`;

export const nombreUsuario = `
SELECT trim(concat_ws(' ', pnombre, papellido)) AS nombre, usuario
FROM usu_usuario WHERE cod = $1
`;
