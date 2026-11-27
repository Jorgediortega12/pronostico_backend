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

// P1 "Lo que aprendió": pronóstico REPORTADO EX-ANTE por FECHA entre $2 y $3 (ISO), UCP $1. Regla canónica (misma del
// script de importación de la demo y del análisis aprobado):
//   - solo filas tipo 'P' (las 'PM' son modificaciones posteriores, no cuentan);
//   - para cada fecha F, la sesión de menor `codigo` guardada al menos 3 días antes: s.fecha <= F - 3 días
//     (con s.fecha timestamp: s.fecha < F - 2 días, sin casts sobre columnas);
//   - la sesión se elige por fecha (no por semana ni por rango fechainicio/fechafin): una sesión que no cubre sáb/dom
//     no hace perder esos días, los toma la siguiente sesión elegible.
// Un solo join y un solo recorrido de sesiones_periodos; el agrupado por lunes y la validación de los 24 periodos se
// hacen en el servicio (un día incompleto se descarta, no se reemplaza). Solo lectura.
export const emisionesRetro = `
SELECT DISTINCT ON (sp.fecha)
       to_char(sp.fecha, 'YYYY-MM-DD') AS fecha, s.codigo, s.version, ${PERIODOS}
FROM sesiones_periodos sp
JOIN sesiones s ON s.codigo = sp.codsesion
WHERE LOWER(s.ucp) = LOWER($1)
  AND sp.tipo = 'P'
  AND sp.fecha >= $2
  AND sp.fecha <= $3
  AND s.fecha < sp.fecha - INTERVAL '2 days'
ORDER BY sp.fecha ASC, s.codigo ASC
`;

// Reales para P1: incluye `codigo` y ordena por (fecha, codigo) para que el servicio deje la ÚLTIMA fila por fecha de
// forma determinista (como el análisis: drop_duplicates keep='last'). `reales` (endpoint existente) no cambia.
export const realesRetro = `
SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, codigo, ${PERIODOS}
FROM actualizaciondatos
WHERE LOWER(ucp) = LOWER($1)
  AND fecha BETWEEN $2 AND $3
ORDER BY fecha ASC, codigo ASC
`;
