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
