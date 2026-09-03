//cargar datos de las sesiones
export const cargarDatosSesiones = `SELECT * FROM carpetas WHERE codsuperior = $1 ORDER BY codigo ASC`;
export const cargarDatosSesionesFactores = `
  SELECT *
  FROM carpetas
  WHERE codsuperior = (
    SELECT codigo
    FROM carpetas
    WHERE nombre = $1
    LIMIT 1
  )
  ORDER BY nombre ASC
`;
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
//cargar versiones previews
export const cargarVrPreviews = `
  SELECT 
    p.codigo, 
    CONCAT_WS('', p.nombre, ' v', p.version) AS nombre
  FROM previews p
  ORDER BY 
    p.fecha DESC
  LIMIT 4;
`;

//eliminar versiones previews
export const eliminarVrPreviews = `
  DELETE FROM previews
  WHERE fecha < NOW() - INTERVAL '24 hours'
`;
// buscar versiones por codigo
export const buscarVersionSesionCod = `SELECT * FROM sesiones WHERE codigo = $1`;
// buscar previews por codigo
export const buscarVersionPreviewCod = `SELECT * FROM previews WHERE codigo = $1`;
// obtener sesiones periodos por código y tipo
export const cargarPeriodosSesion = `SELECT * FROM sesiones_periodos WHERE codsesion = $1 AND tipo = $2 ORDER BY fecha ASC`;
// pronóstico completo del período guardado (tipo 'P' = últimos 7 días
// reportados + tipo 'PM' = resto del período/modelo) — para mostrar la
// sesión completa al cargarla, no sólo la ventana que se reporta
export const cargarPeriodosSesionPronosticoCompleto = `SELECT * FROM sesiones_periodos WHERE codsesion = $1 AND tipo IN ('P', 'PM') ORDER BY fecha ASC`;
// obtener previews periodos por código y tipo
export const cargarPeriodosPreview = `SELECT * FROM previews_periodos WHERE codpreview = $1 AND tipo = $2 ORDER BY fecha ASC`;

export const cargarPeriodosxUCPxFecha = `
  SELECT
  codigo, fecha,
    p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12,
    p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24,
    observacion, estado, resumen_climatico
  FROM actualizaciondatos
  WHERE ucp = $1
    AND (fecha BETWEEN $2 AND $3)
  ORDER BY fecha ASC
`;

export const verificarFechaActualizaciondedatos = `SELECT * FROM actualizaciondatos WHERE ucp=$1 ORDER BY fecha DESC LIMIT 1`;

// Resuelve mercado (ucp) -> ciudad_id primero (el histórico/pronóstico de
// clima ahora se comparte por ciudad, no por mercado) y cae de vuelta al
// match viejo por ucp si ese mercado aún no está vinculado a una ciudad —
// mismo patrón que las consultas de datos_clima en configuracion.query.js.
// Corre contra jano_proxy (ver SesionModel.createClient), así que
// config_ciudades_clima sí es alcanzable desde el mismo cliente.
export const verificarFechaClima = `
  WITH mercado AS (
    SELECT (
      SELECT ciudad_id FROM config_ciudades_clima
      WHERE LOWER(ucp) = LOWER($1) AND ciudad_id IS NOT NULL
      LIMIT 1
    ) AS ciudad_id
  )
  SELECT dc.*
  FROM datos_clima dc CROSS JOIN mercado m
  WHERE
    (m.ciudad_id IS NOT NULL AND dc.ciudad_id = m.ciudad_id)
    OR (m.ciudad_id IS NULL AND LOWER(dc.ucp) = LOWER($1))
  ORDER BY dc.fecha DESC
  LIMIT 1;
`;

export const borrarDatosPronostico = `DELETE FROM pronosticos`;

export const eliminarFechasIngresadasTodo = `DELETE FROM fechas_ingresadas WHERE barra IS NULL`;

export const guardarFechasPronosticas = `INSERT INTO fechas_ingresadas (fechainicio,fechafin,ucp) VALUES ($1,$2,$3)`;

export const borrarDatosTipoPronostico = `DELETE FROM fechas_tipopronostico WHERE ucp=$1`;

export const buscarRutaBatch = `SELECT * FROM ucp WHERE nombre=$1 AND codpadre='88'`;

export const cargarPeriodosPronosticosxUCPxFecha = `SELECT codigo, ucp, fecha, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24, observacion, TO_CHAR(fecha,'d') AS tipodia FROM pronosticos WHERE ucp=$1 AND (fecha BETWEEN $2 AND $3) ORDER BY fecha ASC`;

export const cargarPeriodosxUCPxFechaInicio = `SELECT fecha, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24, observacion, resumen_climatico FROM actualizaciondatos WHERE ucp=$1 AND fecha < $2 ORDER BY fecha DESC LIMIT 30`;

export const buscarTipoPronostico = `SELECT * FROM fechas_tipopronostico WHERE ucp=$1 AND fecha=$2`;

export const ingresarTipoPronostico = `INSERT INTO fechas_tipopronostico (ucp, fecha, tipopronostico) VALUES ($1, $2, $3)`;

export const actualizarTipoPronostico = `UPDATE fechas_tipopronostico SET tipopronostico=$1 WHERE ucp=$2 AND fecha=$3`;

export const verificarUltimaActualizacionPorUcp = `
SELECT DISTINCT ON (ucp) *
FROM actualizaciondatos
ORDER BY ucp, fecha DESC
`;

export const actualizarEstadoDemanda = `UPDATE actualizaciondatos SET estado=$2, observacion=$3 WHERE codigo=$1 RETURNING * ;`;
