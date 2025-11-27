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
