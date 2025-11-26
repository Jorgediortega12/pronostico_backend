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
