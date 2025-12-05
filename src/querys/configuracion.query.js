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
    nombrearchivo, cargaindustrial
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
    $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41
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
//verificar si un dia es festivo
export const buscarDiaFestivo = `SELECT * FROM festivos WHERE fecha=$1 AND ucp=$2;`;

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
    AND aux3 IS NULL
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
