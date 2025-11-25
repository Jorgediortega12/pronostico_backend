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
  // usamos cast $2::int para que Postgres conozca el tipo del parámetro
  const qFind = `
    SELECT * FROM carpetas
    WHERE nombre ILIKE $1
      AND ( (codsuperior IS NULL AND $2::int IS NULL) OR codsuperior = $2::int )
    LIMIT 1
  `;
  // si codsuperior === 0 lo pasamos como NULL (equivalente a raíz)
  const param2 = codsuperior === 0 ? null : codsuperior;
  const rFind = await client.query(qFind, [nombre, param2]);

  if (rFind.rows && rFind.rows.length > 0) return rFind.rows[0];

  const qIns = `INSERT INTO carpetas (nombre, codsuperior, nivel) VALUES ($1, $2, $3) RETURNING *`;
  const vals = [nombre, codsuperior === 0 ? null : codsuperior, nivel];
  const rIns = await client.query(qIns, vals);
  return rIns.rows[0];
}

/**
 * Busca/crea jerarquía para Pronósticos:
 * Reportes -> Pronósticos -> {UCP} -> {YEAR} -> {MONTH}
 * Retorna { codcarpeta, folderPathLogical, folderPathPhysical }
 *
 * folderPathLogical example: '~/Reportes/Pronósticos/Atlantico/2025/Noviembre'
 * folderPathPhysical example: '/srv/app/reportes/pronosticos/MCATLANTICO/2025/Noviembre'
 */
export async function getOrCreatePronosticosMonthFolder(
  client,
  ucpName,
  year,
  monthName,
  reportDirPhysicalRoot
) {
  // 1) Reportes
  const root = await findOrCreateFolder(client, "Reportes", 0, 1);

  // 2) Pronósticos under Reportes
  const pron = await findOrCreateFolder(client, "Pronósticos", root.codigo, 2);

  // 3) UCP folder under Pronósticos (nombre exacto)
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

  const folderPathLogical = `~/Reportes/Pronósticos/${ucpFolder.nombre}/${yearFolder.nombre}/${monthFolder.nombre}`;

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
