// utils/folders.js
import moment from "moment";
import fs from "fs";
import path from "path";

/**
 * Nombres de meses en Español
 */
export const monthNameSpanish = (monthNumber) => {
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return months[Number(monthNumber) - 1] || months[0];
};

/**
 * Crea carpeta física si no existe
 */
export function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// Sin esta unicidad, dos llamadas concurrentes a findOrCreateFolder para la
// misma carpeta (ej. guardar el reporte de varios días en paralelo) pueden
// pasar ambas el SELECT antes de que cualquiera termine el INSERT, creando
// carpetas duplicadas con el mismo nombre bajo el mismo padre. El catch de
// 23505 de más abajo ya asumía que este índice existía, pero nunca se había
// creado. lower(nombre) porque la búsqueda es case-insensitive.
export async function asegurarConstraintUnicaCarpetas(client) {
  try {
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS carpetas_nombre_lower_codsuperior_idx
      ON carpetas (lower(nombre), codsuperior)
    `);
  } catch (err) {
    // Varias conexiones creando el índice por primera vez a la vez: Postgres
    // puede lanzar 23505 sobre el catálogo interno (pg_class) aunque el
    // índice termine existiendo igual — no es un error real, se ignora.
    if (err.code !== "23505") throw err;
  }
}

/**
 * findOrCreateFolder (DB): busca o crea registro en tabla 'carpetas'
 * client: pg client ya conectado
 */
export async function findOrCreateFolder(
  client,
  nombre,
  codsuperior = 0,
  nivel = 1
) {
  await asegurarConstraintUnicaCarpetas(client);

  // NO convertimos codsuperior a NULL: asumimos que la raíz usa 0 en tu esquema
  // 1) Intentamos encontrar
  const qFind = `
    SELECT * FROM carpetas
    WHERE lower(nombre) = lower($1)
      AND codsuperior = $2::int
    LIMIT 1
  `;
  const rFind = await client.query(qFind, [nombre, codsuperior]);
  if (rFind.rows && rFind.rows.length > 0) return rFind.rows[0];

  // 2) Si no existe, intentamos insertar. Manejamos conflicto de unicidad.
  const qIns = `
    INSERT INTO carpetas (nombre, codsuperior, nivel)
    VALUES ($1, $2::int, $3)
    RETURNING *
  `;
  try {
    const rIns = await client.query(qIns, [nombre, codsuperior, nivel]);
    return rIns.rows[0];
  } catch (err) {
    // Si fue un conflicto de unicidad (condición de carrera), re-consultamos la fila
    if (err && err.code === "23505") {
      // unique_violation
      const rRetry = await client.query(qFind, [nombre, codsuperior]);
      if (rRetry.rows && rRetry.rows.length > 0) return rRetry.rows[0];
    }
    // si no es un 23505 o no se encontró después, re-lanzamos el error
    throw err;
  }
}

/**
 * Busca/crea jerarquía para Pronosticos:
 * Reportes -> Pronosticos -> {UCP} -> {YEAR} -> {MONTH}
 * Retorna { codcarpeta, folderPathLogical, folderPathPhysical }
 *
 * folderPathLogical example: '~/reportes/pronosticos/Atlantico/2025/Noviembre'
 * folderPathPhysical example: '/srv/app/reportes/pronosticos/MCATLANTICO/2025/Noviembre'
 */
export async function getOrCreatePronosticosMonthFolder(
  client,
  ucpName,
  year,
  monthName,
  reportDirPhysicalRoot
) {
  // 1) reportes
  const root = await findOrCreateFolder(client, "reportes", 0, 1);

  // 2) pronosticos under reportes
  const pron = await findOrCreateFolder(client, "pronosticos", root.codigo, 2);

  // 3) UCP folder under pronosticos (nombre exacto)
  const ucpFolder = await findOrCreateFolder(client, ucpName, pron.codigo, 3);

  // 4) year under UCP
  const yearFolder = await findOrCreateFolder(
    client,
    String(year),
    ucpFolder.codigo,
    4
  );

  // 5) month under year
  const monthFolder = await findOrCreateFolder(
    client,
    monthName,
    yearFolder.codigo,
    5
  );

  const folderPathLogical = `~/reportes/pronosticos/${ucpFolder.nombre}/${yearFolder.nombre}/${monthFolder.nombre}`;

  // physical folder: REPORT_DIR/pronosticos/{UCP_CLEAN}/{YEAR}/{MONTH}
  const ucpClean = String(ucpName).replace(/\s+/g, "");
  const folderPathPhysical = path.join(
    reportDirPhysicalRoot,
    "pronosticos",
    `${ucpClean}`,
    String(yearFolder.nombre),
    String(monthFolder.nombre)
  );

  // ensure physical dir exists
  ensureDirSync(folderPathPhysical);

  return {
    codcarpeta: monthFolder.codigo,
    folderPathLogical,
    folderPathPhysical,
  };
}

/**
 * Busca/crea jerarquía para Pronóstico Diario — raíz propia (no anidada
 * bajo "reportes"/"pronosticos" como el módulo horario) para que aparezca
 * como una rama separada en Descargas:
 * "Pronósticos diarios" -> {UCP} -> {YEAR} -> {MONTH}
 * Retorna { codcarpeta, folderPathLogical, folderPathPhysical }
 */
export async function getOrCreateDiarioMonthFolder(
  client,
  ucpName,
  year,
  monthName,
  reportDirPhysicalRoot,
) {
  const root = await findOrCreateFolder(client, "Pronósticos diarios", 0, 1);
  const ucpFolder = await findOrCreateFolder(client, ucpName, root.codigo, 2);
  const yearFolder = await findOrCreateFolder(
    client,
    String(year),
    ucpFolder.codigo,
    3,
  );
  const monthFolder = await findOrCreateFolder(
    client,
    monthName,
    yearFolder.codigo,
    4,
  );

  const ucpClean = String(ucpName).replace(/\s+/g, "");
  const folderPathPhysical = path.join(
    reportDirPhysicalRoot,
    "pronosticos_diario",
    `${ucpClean}`,
    String(yearFolder.nombre),
    String(monthFolder.nombre),
  );

  ensureDirSync(folderPathPhysical);

  // folderPathLogical se guarda en `archivos.path` y luego descargarArchivo/
  // verArchivo lo expanden como path.join(process.cwd(), ruta.substring(2))
  // — tiene que ser el mismo path que folderPathPhysical o el archivo
  // "existe" en la carpeta pero nunca se encuentra en disco al
  // descargar/previsualizar. Antes se armaba a mano con el nombre de la
  // carpeta lógica ("Pronósticos diarios", con el nombre de UCP sin
  // limpiar), que no coincidía con la ruta física real (con espacios
  // quitados, bajo "pronosticos_diario"). Derivarlo de folderPathPhysical
  // garantiza que siempre apunten al mismo lugar.
  const folderPathLogical = `~/${path
    .relative(process.cwd(), folderPathPhysical)
    .split(path.sep)
    .join("/")}`;

  return {
    codcarpeta: monthFolder.codigo,
    folderPathLogical,
    folderPathPhysical,
  };
}
