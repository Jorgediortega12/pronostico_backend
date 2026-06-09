//buscar documentos dentro de la db de ucp
export const buscarSaveDocumento = `SELECT * FROM ucp WHERE aux3 = $1 AND codpadre = '69';`;
// cargar dias de potencia dentro de la db datos_potencia
export const cargarDiasPotencia = `SELECT * FROM datos_potencias WHERE ucp = $1 ORDER BY dia ASC`;
//buscar version sesion
export const buscarVersionSesion = `SELECT * FROM sesiones WHERE nombre = $1 ORDER BY codigo DESC`;
//agregar version sesion
export const agregarVersionSesion = `
  INSERT INTO sesiones (
    fecha, ucp, fechainicio, fechafin, tipodatos, tendencia, dias,
    edicionfiltro, edicionperiodo, ediciontexto, edicionfecha, edicionsuma,
    nombre, version, usuario,
    p1_diario, p2_diario, p3_diario, p4_diario, p5_diario, p6_diario,
    p7_diario, p8_diario, p9_diario, p10_diario, p11_diario, p12_diario,
    p13_diario, p14_diario, p15_diario, p16_diario, p17_diario, p18_diario,
    p19_diario, p20_diario, p21_diario, p22_diario, p23_diario, p24_diario,
    nombrearchivo, cargaindustrial, observacion
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
    $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
  ) RETURNING *
`;
//agregar datos pronostico por sesion
export const agregarDatosPronosticoxSesion = `
  INSERT INTO sesiones_periodos (
    codsesion, check_f, fecha, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10,
    p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24,
    observacion, tipo
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
  ) RETURNING *
`;

//buscar version preview
export const buscarVersionPreview = `SELECT * FROM previews WHERE nombre = $1 ORDER BY codigo DESC`;

//agregar version Preview
export const agregarVersionPreview = `
  INSERT INTO previews (
    fecha, ucp, fechainicio, fechafin, nombre, version, usuario
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7
  ) RETURNING *
`;

//agregar datos pronostico por sesion
export const agregarDatosPronosticoxPreview = `
  INSERT INTO previews_periodos (
    codpreview, fecha, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10,
    p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24, tipo
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
  ) RETURNING *
`;
//verificar si un dia es festivo
export const buscarDiaFestivo = `SELECT * FROM festivos WHERE fecha=$1 AND ucp=$2;`;

export const listarFestivosPorRango = `
SELECT
  codigo,
  ucp,
  TO_CHAR(fecha::date, 'YYYY-MM-DD') AS fecha
FROM festivos
WHERE fecha BETWEEN $1 AND $2
  AND ucp = $3
ORDER BY fecha ASC;

`;

//buscar dias potencia
export const buscarPotenciaDia = `SELECT * FROM datos_potencias WHERE ucp = $1 AND dia=$2`;

// traer datos desde fechaInicio hasta el más reciente
export const cargarPeriodosxUCPDesdeFecha = `
  SELECT fecha, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12,
         p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24,
         observacion
  FROM actualizaciondatos
  WHERE LOWER(ucp) = LOWER($1)
    AND fecha >= $2
  ORDER BY fecha ASC;
`;

// traer variables climaticas desde fechaInicio hasta el más reciente
export const cargarVariablesClimaticasxUCPDesdeFecha = `
  SELECT *
  FROM datos_clima
  WHERE LOWER(ucp) = LOWER($1)
    AND fecha >= $2
  ORDER BY fecha ASC;
`;

export const cargarPeriodosxUCPxUnaFechaxLimite = `SELECT * FROM actualizaciondatos ac WHERE ucp =$1 AND fecha<$2 ORDER BY fecha DESC LIMIT $3`;

export const cargarTodosLosDiasPotencia =
  "SELECT * FROM datos_potencias ORDER BY dia ASC";

export const actualizarDiaPotencia = `
  UPDATE datos_potencias
  SET dia=$1,
      potencia1=$2,
      potencia2=$3,
      potencia3=$4,
      potencia4=$5,
      potencia5=$6,
      potencia6=$7,
      potencia7=$8,
      ucp=$9
  WHERE codigo=$10
  RETURNING *;
`;

export const crearDiaPotencia = `
  INSERT INTO datos_potencias
    (dia, potencia1, potencia2, potencia3, potencia4, potencia5, potencia6, potencia7, ucp)
  VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *;
`;

// AGREGAR FUENTES
export const agregarUCPMedida = `
  INSERT INTO ucp
    (nombre, factor, codigo_rpm, codpadre, estado, aux, aux2, aux3, aux4)
  VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *;
`;

// CARGAR FUENTES
export const cargarFuentes = `
  SELECT *
  FROM ucp
  WHERE codigo_rpm IS NULL
    AND codpadre = 0
    AND estado = 1
    AND aux IS NULL
    AND aux2 = 'Fuente'
  ORDER BY nombre ASC;
`;

// actualizar UCP (actualiza nombre, factor, y campos opcionales si quieres)
export const actualizarUCPMedida = `
  UPDATE ucp
  SET nombre = $1,
      factor = $2,
      codigo_rpm = $3,
      codpadre = $4,
      estado = $5,
      aux = $6,
      aux2 = $7,
      aux3 = $8,
      aux4 = $9
  WHERE codigo = $10
  RETURNING *;
`;

// eliminar UCP por codigo
export const eliminarUCPMedida = `
  DELETE FROM ucp
  WHERE codigo = $1
  RETURNING *;
`;

export const cargarEquivalencias = `
  SELECT
    u.nombre AS nombrepadre,
    u2.*,
    (CASE u2.aux4 WHEN '1' THEN 'Aplica' ELSE 'No aplica' END) AS c_as
  FROM ucp u
  INNER JOIN ucp u2 ON u.codigo = u2.codpadre
  WHERE u.estado = '1'
    AND u2.estado = '1'
    AND u.aux2 = 'Fuente'
    AND u2.aux3 IS NOT NULL
  ORDER BY u2.nombre, u.nombre;
`;

export const cargarUCP = `
  SELECT DISTINCT(aux2) AS mc
  FROM ucp
  WHERE codpadre = $1
    AND estado = $2
    AND aux2 IS NOT NULL
    AND aux2 <> ''
  ORDER BY aux2 ASC;
`;

// ─── FLUJOS ──────────────────────────────────────────────────────────────────

// Obtener flujos de una fuente
export const obtenerFlujosPorFuente = `
  SELECT f.*, u.nombre AS nombre_fuente
  FROM flujo f
  INNER JOIN ucp u ON u.codigo = f.codigo_fuente
  WHERE f.codigo_fuente = $1
    AND f.estado = 1
  ORDER BY f.nombre ASC;
`;

// Crear flujo
export const crearFlujo = `
  INSERT INTO flujo (nombre, codigo_fuente)
  VALUES ($1, $2)
  RETURNING *;
`;

// Actualizar flujo
export const actualizarFlujo = `
  UPDATE flujo
  SET nombre = $1,
      codigo_fuente = $2
  WHERE id = $3
  RETURNING *;
`;

// Eliminar flujo (soft delete)
export const eliminarFlujo = `
  UPDATE flujo
  SET estado = 0
  WHERE id = $1
  RETURNING *;
`;

// ─── EQUIVALENCIA_FLUJO ───────────────────────────────────────────────────────

/**
 * Carga equivalencias de una fuente con sus valores para un flujo dado.
 * Hace LEFT JOIN para que aparezcan aunque no tengan valor aún.
 */
export const obtenerEquivalenciasPorFlujo = `
  SELECT
    u2.*,
    u_padre.nombre  AS nombre_fuente,
    f.id            AS id_flujo,
    f.nombre        AS nombre_flujo,
    ef.id           AS id_ef,
    ef.valor        AS valor_flujo
  FROM ucp u2
  INNER JOIN ucp u_padre ON u_padre.codigo = u2.codpadre
  INNER JOIN flujo f     ON f.id = $1::integer
  LEFT  JOIN equivalencia_flujo ef
          ON ef.codigo_ucp = u2.codigo
         AND ef.id_flujo   = f.id
         AND ef.estado     = 1
  WHERE u2.estado  = 1
    AND u2.aux3 IS NOT NULL
    AND u2.aux3    != ''
    AND u2.aux2    IS NOT NULL
  ORDER BY u_padre.nombre ASC, u2.aux2 ASC;
`;

// Upsert: crear o actualizar valor de equivalencia para un flujo
export const upsertEquivalenciaFlujo = `
  INSERT INTO equivalencia_flujo (codigo_ucp, id_flujo, valor)
  VALUES ($1, $2, $3)
  ON CONFLICT (codigo_ucp, id_flujo)
  DO UPDATE SET valor = EXCLUDED.valor, estado = 1
  RETURNING *;
`;

// Eliminar valor (soft delete)
export const eliminarEquivalenciaFlujo = `
  UPDATE equivalencia_flujo
  SET estado = 0
  WHERE id = $1
  RETURNING *;
`;

// Obtener todos los flujos (para el select del frontend, agrupados por fuente)
export const obtenerTodosLosFlujos = `
  SELECT f.*, u.nombre AS nombre_fuente
  FROM flujo f
  INNER JOIN ucp u ON u.codigo = f.codigo_fuente
  WHERE f.estado = 1
  ORDER BY u.nombre ASC, f.nombre ASC;
`;

// Query para usar en la transacción de actualización en cascada.
// Usaremos parámetros ($1 = mc, $2 = mcnuevo)
export const editarMercadoCascadeQueries = {
  // actualizar nombre en ucp (registro padre/hijo)
  editarMercadoNombre: `UPDATE ucp SET nombre = $2 WHERE nombre = $1;`,
  editarMercadoAux2: `UPDATE ucp SET aux2 = $2 WHERE aux2 = $1;`,
  editarMercadoAux3: `UPDATE ucp SET aux3 = $2 WHERE aux3 = $1;`,
  // tablas relacionadas
  editarMercadoBarras: `UPDATE barras SET mc = $2 WHERE mc = $1;`,
  editarMercadoDatosClima: `UPDATE datos_clima SET ucp = $2 WHERE ucp = $1;`,
  editarMercadoDatosClimaLog: `UPDATE datos_climalog SET ucp = $2 WHERE ucp = $1;`,
  editarMercadoDatosPotencias: `UPDATE datos_potencias SET ucp = $2 WHERE ucp = $1;`,
  editarMercadoFechasIngresadas: `UPDATE fechas_ingresadas SET ucp = $2 WHERE ucp = $1;`,
  editarMercadoFechasTipoPronosticos: `UPDATE fechas_tipopronostico SET ucp = $2 WHERE ucp = $1;`,
  editarMercadoFestivos: `UPDATE festivos SET ucp = $2 WHERE ucp = $1;`,
  editarMercadoObservaciones: `UPDATE observaciones_analisis SET ucp = $2 WHERE ucp = $1;`,
  editarMercadoPronostico: `UPDATE pronosticos SET ucp = $2 WHERE ucp = $1;`,
  editarMercadoSesiones: `UPDATE sesiones SET ucp = $2 WHERE ucp = $1;`,
  editarMercadoActualizacionDatos: `UPDATE actualizaciondatos SET ucp = $2 WHERE ucp = $1;`,
};

export const cargarUmbral = `
  SELECT *
  FROM ucp
  WHERE codpadre = $1
    AND estado = $2
  ORDER BY codigo ASC;
`;

// editarUmbral: $1 = aux2 (valor), $2 = codigo
export const editarUmbral = `
  UPDATE ucp
  SET aux2 = $1
  WHERE codigo = $2;
`;

// querys/festivos.js
export const cargarDiasFestivos = `
  SELECT *
  FROM festivos
  WHERE EXTRACT(YEAR FROM fecha) = $1
    AND ucp = $2
  ORDER BY fecha ASC;
`;

export const ingresarDiaFestivos = `
  INSERT INTO festivos (ucp, fecha)
  VALUES ($1, $2)
  RETURNING *;
`;

export const borrarDiaFestivos = `
  DELETE FROM festivos
  WHERE codigo = $1
  RETURNING *;
`;

export const buscarUltimaFechaHistorica = `SELECT * FROM actualizaciondatos WHERE ucp=$1 ORDER BY fecha DESC LIMIT 1`;

export const buscarUltimaFechaClimaLog = `SELECT * FROM datos_climalog WHERE fecha=$1 ORDER BY fecha DESC LIMIT 1`;

export const buscarUltimaFechaClima = `SELECT * FROM datos_clima ORDER BY fecha DESC LIMIT 1`;

export const buscarKey = "SELECT aux FROM ucp WHERE codigo='15'";

export const buscarFactor = `SELECT * FROM ucp WHERE codigo=$1;`;

export const cargarCodigoRMPxUCP = `SELECT aux2, aux, codigo_rpm, factor FROM ucp WHERE codpadre=$1 AND estado='1' GROUP BY aux2, aux, codigo_rpm, factor;`;

export const cargarTipoArchivos = `SELECT * FROM ucp WHERE estado=$1 AND aux2=$2 AND codpadre='0' ORDER BY nombre ASC`;

export const cargarUCPxAux2 = `SELECT DISTINCT(codigo_rpm), aux4 AS c_as FROM ucp WHERE aux2=$1;`;

export const buscarUCPActualizacionDatos = `SELECT * FROM actualizaciondatos WHERE ucp=$1 AND fecha=$2;`;

export const verificarExisteActualizacionDatos = `SELECT COUNT(*) as count FROM actualizaciondatos WHERE ucp=$1 AND fecha=$2;`;

export const agregarUCPActualizacionDatos = `INSERT INTO actualizaciondatos (ucp, fecha, observacion, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24, estado, festivo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,$25, $26, $27, $28, $29) RETURNING *`;

export const actualizarUCPActualizacionDatos = `UPDATE actualizaciondatos SET p1=$1, p2=$2, p3=$3, p4=$4, p5=$5, p6=$6, p7=$7, p8=$8, p9=$9, p10=$10, p11=$11, p12=$12, p13=$13, p14=$14, p15=$15, p16=$16, p17=$17, p18=$18, p19=$19, p20=$20, p21=$21, p22=$22, p23=$23, p24=$24, estado=$25, observacion=$26, festivo=$27 WHERE ucp=$28 AND fecha=$29 RETURNING *`;

export const buscarClimaPeriodos = `SELECT * FROM datos_clima WHERE ucp=$1 AND fecha=$2`;

export const agregarClimaPronosticoLog = `
  INSERT INTO datos_climalog (fecha, ucp)
  VALUES ($1, $2)
  RETURNING *;
`;

export const buscarTipicidad = `
  SELECT estado
  FROM actualizaciondatos
  WHERE ucp = $1 AND fecha = $2
  LIMIT 1;
`;

// 🔹 Traer datos climáticos por rango
export const cargarVariablesClimaticasxFechaPeriodos = `
  SELECT *
  FROM datos_clima
  WHERE ucp = $1
    AND fecha BETWEEN $2 AND $3
  ORDER BY fecha ASC;
`;

// 🔹 Buscar icono (MISMA lógica que .NET)
export const buscarIcono = `
  SELECT icon_dia, icon_noche
  FROM datos_climaicons
  WHERE id = $1
    AND dia = $2
    AND noche = $3
  LIMIT 1;
`;

// 🔹 Fallback EXACTO (.NET)
export const buscarIcono2 = `
  SELECT icon_dia, icon_noche
  FROM datos_climaicons
  WHERE id = $1
  LIMIT 1;
`;

export const listarTipoModeloPorRango = `
SELECT
  codigo,
  ucp,
  TO_CHAR(fecha::date, 'YYYY-MM-DD') AS fecha,
  tipopronostico
FROM fechas_tipopronostico
WHERE fecha::date BETWEEN $1::date AND $2::date
  AND ucp = $3
ORDER BY fecha ASC;
`;

export const upsertTipoPronostico = `
  INSERT INTO fechas_tipopronostico (ucp, fecha, tipopronostico)
  VALUES ($1, $2, $3)
  ON CONFLICT (ucp, fecha)
  DO UPDATE SET
    tipopronostico = EXCLUDED.tipopronostico
  RETURNING *;
`;

export const cargarHistoricosPronosticosDinamico = `
WITH ultima_sesion AS (
  SELECT s.codigo
  FROM sesiones s
  WHERE s.ucp = $1
    AND s.fechainicio <= $3
    AND s.fechafin >= $2
  ORDER BY s.version DESC
  LIMIT 1
)
SELECT
  sp.*,
  CASE
    WHEN f.fecha IS NOT NULL THEN 1
    ELSE 0
  END AS es_festivo
FROM sesiones_periodos sp
JOIN ultima_sesion us ON us.codigo = sp.codsesion
LEFT JOIN festivos f
  ON f.ucp = $1
 AND f.fecha = sp.fecha
WHERE sp.tipo = 'P'
  AND sp.fecha BETWEEN $2 AND $3
`;

export const listarTodosLosFestivos = `
  SELECT *
  FROM festivos WHERE ucp = $1 ORDER BY fecha DESC;
  `;

export const buscarSemanaSimilar = `
WITH fechas_base AS (
  SELECT DISTINCT fecha::date AS fecha
  FROM actualizaciondatos
  WHERE ucp = $1
),
festivos_reales AS (
  SELECT fecha::date AS fecha
  FROM festivos
  WHERE ucp = $1
),
dias_con_pos AS (
  SELECT
    fb.fecha,
    CASE WHEN fr.fecha IS NOT NULL THEN 1 ELSE 0 END AS es_festivo,
    (EXTRACT(DOW FROM fb.fecha)::int + 6) % 7 AS pos_semana,
    (fb.fecha - (((EXTRACT(DOW FROM fb.fecha)::int + 6) % 7) * INTERVAL '1 day'))::date AS semana_inicio
  FROM fechas_base fb
  LEFT JOIN festivos_reales fr ON fr.fecha = fb.fecha
),
semanas_agrupadas AS (
  SELECT
    semana_inicio,
    COUNT(DISTINCT fecha) AS dias_con_datos,
    -- mes_inicio: mes mayoritario de los días de esa semana
    -- (el mes que más días tiene dentro de la semana)
    MODE() WITHIN GROUP (ORDER BY EXTRACT(MONTH FROM fecha)::int) AS mes_inicio,
    EXTRACT(DAY FROM semana_inicio)::int AS dia_mes_inicio,
    (EXTRACT(DOW FROM DATE_TRUNC('month', semana_inicio))::int + 6) % 7 AS dow_inicio_mes,
    ARRAY[
      MAX(CASE WHEN pos_semana = 0 THEN es_festivo ELSE 0 END),
      MAX(CASE WHEN pos_semana = 1 THEN es_festivo ELSE 0 END),
      MAX(CASE WHEN pos_semana = 2 THEN es_festivo ELSE 0 END),
      MAX(CASE WHEN pos_semana = 3 THEN es_festivo ELSE 0 END),
      MAX(CASE WHEN pos_semana = 4 THEN es_festivo ELSE 0 END),
      MAX(CASE WHEN pos_semana = 5 THEN es_festivo ELSE 0 END),
      MAX(CASE WHEN pos_semana = 6 THEN es_festivo ELSE 0 END)
    ] AS festivos_mask,
    ARRAY_AGG(DISTINCT fecha ORDER BY fecha) AS dias
  FROM dias_con_pos
  GROUP BY semana_inicio
)
SELECT
  semana_inicio,
  dias_con_datos,
  festivos_mask,
  mes_inicio,
  dia_mes_inicio,
  dow_inicio_mes,
  dias
FROM semanas_agrupadas
WHERE dias_con_datos >= 3
  AND semana_inicio < CURRENT_DATE - INTERVAL '7 days'
ORDER BY semana_inicio DESC
`;
