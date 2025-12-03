//cargar datos de las sesiones
export const cargarDatosSesiones = `SELECT * FROM carpetas WHERE codsuperior = $1 ORDER BY nombre ASC`;
//cargar archivos versiones sesiones
export const cargarArchivoVrSesiones = `
  SELECT 
    s.codigo, 
    CONCAT_WS('', s.nombre, ' v', s.version) AS nombre 
  FROM archivos a 
  INNER JOIN sesiones s 
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
// buscar versiones por codigo
export const buscarVersionSesionCod = `SELECT * FROM sesiones WHERE codigo = $1`;
// obtener sesiones periodos por código y tipo
export const cargarPeriodosSesion = `SELECT * FROM sesiones_periodos WHERE codsesion = $1 AND tipo = $2 ORDER BY fecha ASC`;

export const cargarPeriodosxUCPxFecha = `
  SELECT
    fecha,
    p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12,
    p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24,
    observacion
  FROM actualizaciondatos
  WHERE ucp = $1
    AND (fecha BETWEEN $2 AND $3)
  ORDER BY fecha ASC
`;

export const verificarFechaActualizaciondedatos = `SELECT * FROM actualizaciondatos WHERE ucp=$1 ORDER BY fecha DESC LIMIT 1`;

export const verificarFechaClima = `SELECT * FROM datos_clima WHERE ucp=$1 ORDER BY fecha DESC LIMIT 1`;

export const borrarDatosPronostico = `DELETE FROM pronosticos`;

export const eliminarFechasIngresadasTodo = `DELETE FROM fechas_ingresadas WHERE barra IS NULL`;

export const guardarFechasPronosticas = `INSERT INTO fechas_ingresadas (fechainicio,fechafin,ucp) VALUES ($1,$2,$3)`;

export const borrarDatosTipoPronostico = `DELETE FROM fechas_tipopronostico WHERE ucp=$1`;

export const buscarRutaBatch = `SELECT * FROM ucp WHERE nombre=$1 AND codpadre='88'`;

export const cargarPeriodosPronosticosxUCPxFecha = `SELECT codigo, ucp, fecha, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24, observacion, TO_CHAR(fecha,'d') AS tipodia FROM pronosticos WHERE ucp=$1 AND (fecha BETWEEN $2 AND $3) ORDER BY fecha ASC`;

export const cargarPeriodosxUCPxFechaInicio = `SELECT fecha, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24, observacion FROM actualizaciondatos WHERE ucp=$1 AND fecha < $2 ORDER BY fecha DESC LIMIT 30`;

export const buscarTipoPronostico = `SELECT * FROM fechas_tipopronostico WHERE ucp=$1 AND fecha=$2`;

export const ingresarTipoPronostico = `INSERT INTO fechas_tipopronostico (ucp, fecha, tipopronostico) VALUES ($1, $2, $3)`;

export const actualizarTipoPronostico = `UPDATE fechas_tipopronostico SET tipopronostico=$1 WHERE ucp=$2 AND fecha=$3`;

export const verificarUltimaActualizacionPorUcp = `
SELECT DISTINCT ON (ucp) *
FROM actualizaciondatos
ORDER BY ucp, fecha DESC
`;
