import fs from "fs";
import path from "path";
import os from "os";
import { createUnzip } from "zlib";
import { pipeline } from "stream/promises";
import { createReadStream, createWriteStream } from "fs";
import { parse } from "csv-parse/sync";
import pkg from "pg";
import dotenv from "dotenv";
import Logger from "../helpers/logger.js";
import colors from "colors";

dotenv.config();

const { Client } = pkg;

function createClient() {
  return new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT) || 5433,
  });
}

const VALID_EXTENSIONS = [".txf", ".txr", ".tx2"];
const PRIORITY = { "txf": 1, "txr": 2, "tx2": 3, "tx3": 4 };

// Detecta el tipo ADEM desde extensión (.txf) o desde nombre del archivo (adem_TxF_..._unidos.txt)
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase().slice(1);
  if (["txf", "txr", "tx2", "tx3"].includes(ext)) return ext;
  // Formato: adem_TxF_01_2026_unidos.txt
  const m = filename.match(/[_-](Tx[FfRr23])[_-]/i);
  if (m) return m[1].toLowerCase();
  return null;
}

function isAdemFile(filename) {
  if (!filename) return false;
  return getFileType(filename) !== null;
}

function getExtLower(filename) {
  return path.extname(filename).toLowerCase();
}


function extractMMDD(filename) {
  const base = path.basename(filename, path.extname(filename)).toLowerCase();
  // Buscar patrón MMDD (4 dígitos) al final del nombre base
  const match = base.match(/(\d{4})$/);
  return match ? match[1] : null;
}

function selectByPriority(files) {
  return files.sort((a, b) => {
    const pa = PRIORITY[getExtLower(a)] ?? 999;
    const pb = PRIORITY[getExtLower(b)] ?? 999;
    return pa - pb;
  })[0];
}

function groupAndSelectFiles(files) {
  const byDate = {};
  for (const f of files) {
    const mmdd = extractMMDD(f);
    if (!mmdd) continue;
    if (!byDate[mmdd]) byDate[mmdd] = [];
    byDate[mmdd].push(f);
  }
  return Object.values(byDate).map(selectByPriority);
}

function parseTipofecha(dateStr, holidays) {
  const d = new Date(dateStr);
  const dow = d.getUTCDay(); // 0=Dom, 6=Sab
  if (holidays.has(dateStr) || dow === 0) return "2";
  if (dow === 6) return "1";
  return "0";
}

function colombianHolidays(year) {
  const holidays = new Set();
  const fixed = [
    `${year}-01-01`, `${year}-05-01`, `${year}-07-20`,
    `${year}-08-07`, `${year}-12-08`, `${year}-12-25`,
  ];
  fixed.forEach((d) => holidays.add(d));
  return holidays;
}

// Retorna un array de { hora_1..hora_24, total, fecha? }
// Para archivos diarios → 1 elemento. Para archivos mensuales unidos → N elementos (uno por día).
function parseAdemFile(filePath) {
  const raw = fs.readFileSync(filePath, { encoding: "latin1" });
  const rows = parse(raw, {
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (!rows.length) throw new Error(`Archivo vacío: ${filePath}`);

  const cols = Object.keys(rows[0]);
  const codigos = [...new Set(rows.map((r) => `${r["CODIGO"]?.trim()}|${r["AGENTE"]?.trim()}`))];
  Logger.info(colors.cyan(`[ADEM] ${path.basename(filePath)} — columnas: ${JSON.stringify(cols)} — pares CODIGO|AGENTE: ${JSON.stringify(codigos.slice(0, 20))}`));

  const toNum = (v) => {
    if (v === undefined || v === null || v === "") return 0;
    return parseFloat(String(v).replace(",", ".")) || 0;
  };

  // Detectar columna de fecha (FECHA, FECHAS, DATE, etc.)
  const fechaCol = cols.find((c) => /fecha/i.test(c));

  // Agentes preferidos en orden de prioridad
  const AGENTES_PREFERIDOS = ["CMMC", "CMC", "CMEC"];

  const buildRecord = (dmre, prre = {}) => {
    const horas = {};
    let total = 0;
    for (let i = 1; i <= 24; i++) {
      const key = `HORA ${String(i).padStart(2, "0")}`;
      const val = toNum(dmre[key]) + toNum(prre[key]);
      horas[`hora_${i}`] = val;
      total += val;
    }
    return { ...horas, total };
  };

  const normalizeFecha = (raw) => {
    if (!raw) return null;
    const s = raw.trim();
    const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  };

  // Seleccionar agente: preferido primero, si no hay usar el primero disponible con DMRE/DMNR
  const agentesEnArchivo = [...new Set(rows.map((r) => r["AGENTE"]?.trim()).filter(Boolean))];
  const agente = AGENTES_PREFERIDOS.find((a) => agentesEnArchivo.includes(a))
    ?? agentesEnArchivo.find((a) =>
        rows.some((r) => r["AGENTE"]?.trim() === a &&
          ["DMRE","DMNR"].includes(r["CODIGO"]?.trim()))
      );

  if (!agente) {
    throw new Error(
      `${path.basename(filePath)}: agentes disponibles (${agentesEnArchivo.slice(0,10).join(",")}) — ninguno tiene DMRE/DMNR`
    );
  }

  Logger.info(colors.cyan(`[ADEM] ${path.basename(filePath)} — usando agente: ${agente} (disponibles: ${agentesEnArchivo.slice(0,10).join(",")})`));
  const rowsAgente = rows.filter((r) => r["AGENTE"]?.trim() === agente);

  if (fechaCol) {
    // Archivo mensual: agrupar por fecha
    const fechas = [...new Set(rowsAgente.map((r) => r[fechaCol]?.trim()).filter(Boolean))];
    Logger.info(colors.cyan(`[ADEM] ${path.basename(filePath)} — archivo mensual, ${fechas.length} fechas: ${JSON.stringify(fechas.slice(0, 5))}`));
    const records = [];
    for (const fecha of fechas) {
      const fechaNorm = normalizeFecha(fecha);
      if (!fechaNorm) { Logger.warn(colors.yellow(`[ADEM] Fecha no reconocida "${fecha}" — saltando`)); continue; }
      const dayRows = rowsAgente.filter((r) => r[fechaCol]?.trim() === fecha);
      const dmnr = dayRows.find((r) => r["CODIGO"]?.trim() === "DMNR");
      if (dmnr) { records.push({ ...buildRecord(dmnr), _fecha: fechaNorm }); continue; }
      const dmre = dayRows.find((r) => r["CODIGO"]?.trim() === "DMRE");
      const prre = dayRows.find((r) => r["CODIGO"]?.trim() === "PRRE");
      if (dmre && prre) { records.push({ ...buildRecord(dmre, prre), _fecha: fechaNorm }); continue; }
      Logger.warn(colors.yellow(`[ADEM] Sin DMNR/DMRE+PRRE para agente ${agente} en fecha ${fecha}`));
    }
    if (!records.length) throw new Error(`${path.basename(filePath)}: no se pudo extraer ningún día`);
    return records;
  }

  // Archivo diario
  const dmnr = rowsAgente.find((r) => r["CODIGO"]?.trim() === "DMNR");
  if (dmnr) return [buildRecord(dmnr)];
  const dmre = rowsAgente.find((r) => r["CODIGO"]?.trim() === "DMRE");
  const prre = rowsAgente.find((r) => r["CODIGO"]?.trim() === "PRRE");
  if (dmre && prre) return [buildRecord(dmre, prre)];

  throw new Error(
    `${path.basename(filePath)}: agente ${agente} no tiene DMNR ni DMRE+PRRE — códigos disponibles: ${[...new Set(rowsAgente.map(r => r["CODIGO"]?.trim()))].join(",")}`
  );
}

// ─── Detección de estructura del ZIP ──────────────────────────────────────────
// Busca recursivamente (hasta maxDepth niveles) la primera carpeta cuyo nombre sea un año válido
function detectYearDir(dir, depth = 0, maxDepth = 3) {
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return null; }

  // Primero buscar en el nivel actual
  for (const entry of entries) {
    const num = parseInt(entry, 10);
    if (!isNaN(num) && num >= 2000 && num <= 2100) {
      const full = path.join(dir, entry);
      try {
        if (fs.statSync(full).isDirectory()) {
          Logger.info(colors.cyan(`[ADEM] Carpeta año "${entry}" encontrada en: ${full}`));
          return { year: num, yearDir: full };
        }
      } catch { /* ignorar */ }
    }
  }

  // Luego buscar un nivel más profundo en subdirectorios no-año
  if (depth < maxDepth) {
    for (const entry of entries) {
      const full = path.join(dir, entry);
      try {
        if (fs.statSync(full).isDirectory()) {
          const found = detectYearDir(full, depth + 1, maxDepth);
          if (found) return found;
        }
      } catch { /* ignorar */ }
    }
  }

  return null;
}

function discoverAdemFiles(extractDir) {
  const found = detectYearDir(extractDir);
  if (!found) {
    throw new Error(
      "No se encontró ninguna carpeta con nombre de año (ej: 2024/) dentro del ZIP."
    );
  }
  const { year, yearDir } = found;

  const results = [];

  const contents = fs.readdirSync(yearDir);
  Logger.info(colors.cyan(`[ADEM] Contenido de ${yearDir}: ${JSON.stringify(contents)}`));

  const ademSubdir = path.join(yearDir, "adem");
  if (fs.existsSync(ademSubdir) && fs.statSync(ademSubdir).isDirectory()) {
    const months = fs.readdirSync(ademSubdir);
    Logger.info(colors.cyan(`[ADEM] Subcarpeta "adem" encontrada — meses: ${JSON.stringify(months)}`));
    for (const mon of months) {
      const monthDir = path.join(ademSubdir, mon);
      if (!fs.statSync(monthDir).isDirectory()) continue;
      const mm = String(mon).padStart(2, "0");
      const allEntries = fs.readdirSync(monthDir);
      Logger.info(colors.cyan(`[ADEM] Mes ${mm} — entradas: ${JSON.stringify(allEntries)}`));

      // Recolectar archivos ADEM: directos en monthDir + dentro de subcarpetas Tx*/
      const candidates = []; // { filePath, fileType }
      for (const entry of allEntries) {
        const entryPath = path.join(monthDir, entry);
        const stat = fs.statSync(entryPath);
        if (stat.isFile() && isAdemFile(entry)) {
          candidates.push({ filePath: entryPath, fileType: getFileType(entry) });
        } else if (stat.isDirectory()) {
          // Subcarpetas tipo TxF/, TxR/, Tx2/
          const subFiles = fs.readdirSync(entryPath);
          for (const sf of subFiles) {
            if (isAdemFile(sf)) {
              candidates.push({ filePath: path.join(entryPath, sf), fileType: getFileType(sf) });
            }
          }
        }
      }

      Logger.info(colors.cyan(`[ADEM] Mes ${mm} — candidatos encontrados: ${candidates.length} — tipos: ${JSON.stringify([...new Set(candidates.map(c => c.fileType))])}`));

      if (candidates.length === 0) continue;

      // Seleccionar el de mayor prioridad (menor número en PRIORITY)
      const best = candidates.reduce((a, b) =>
        (PRIORITY[a.fileType] ?? 99) <= (PRIORITY[b.fileType] ?? 99) ? a : b
      );
      const mmdd = extractMMDD(path.basename(best.filePath)) || `${mm}00`;
      results.push({ filePath: best.filePath, mmdd, fileType: best.fileType, mm });
    }
    if (results.length > 0) return { year, structure: 2, files: results };
    Logger.warn(colors.yellow(`[ADEM] Subcarpeta "adem" existe pero no se encontraron archivos válidos`));
  } else {
    Logger.info(colors.yellow(`[ADEM] No existe subcarpeta "adem" en ${yearDir} — intentando estructura directa`));
  }

  const directFiles = contents.filter((f) => {
    const full = path.join(yearDir, f);
    return fs.statSync(full).isFile() && isAdemFile(f);
  });
  Logger.info(colors.cyan(`[ADEM] Archivos directos en yearDir: ${JSON.stringify(directFiles.slice(0, 5))}`));

  if (directFiles.length > 0) {
    const selected = groupAndSelectFiles(directFiles);
    for (const f of selected) {
      const mmdd = extractMMDD(f);
      if (!mmdd) continue;
      results.push({ filePath: path.join(yearDir, f), mmdd, fileType: getFileType(f) });
    }
    return { year, structure: 1, files: results };
  }

  throw new Error(
    `No se encontraron archivos de demanda (.txf/.txr/.tx2) en ninguna estructura reconocida dentro de ${yearDir}`
  );
}

async function upsertDemandRecords(records) {
  const client = createClient();
  await client.connect();

  const checkSQL  = `SELECT id FROM "PRONOSTICO_demands" WHERE fecha = $1 LIMIT 1`;
  const insertSQL = `
    INSERT INTO "PRONOSTICO_demands" (
      hora_1,hora_2,hora_3,hora_4,hora_5,hora_6,
      hora_7,hora_8,hora_9,hora_10,hora_11,hora_12,
      hora_13,hora_14,hora_15,hora_16,hora_17,hora_18,
      hora_19,hora_20,hora_21,hora_22,hora_23,hora_24,
      total,fecha,tipo_fecha,file_type
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
              $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
              $25,$26,$27,$28)`;
  const updateSQL = `
    UPDATE "PRONOSTICO_demands" SET
      hora_1=$1,hora_2=$2,hora_3=$3,hora_4=$4,hora_5=$5,hora_6=$6,
      hora_7=$7,hora_8=$8,hora_9=$9,hora_10=$10,hora_11=$11,hora_12=$12,
      hora_13=$13,hora_14=$14,hora_15=$15,hora_16=$16,hora_17=$17,hora_18=$18,
      hora_19=$19,hora_20=$20,hora_21=$21,hora_22=$22,hora_23=$23,hora_24=$24,
      total=$25,tipo_fecha=$27,file_type=$28
    WHERE fecha=$26`;

  let inserted = 0;
  let updated  = 0;
  let errors   = 0;

  try {
    await client.query("BEGIN");
    for (const rec of records) {
      try {
        const vals = [
          rec.hora_1,  rec.hora_2,  rec.hora_3,  rec.hora_4,
          rec.hora_5,  rec.hora_6,  rec.hora_7,  rec.hora_8,
          rec.hora_9,  rec.hora_10, rec.hora_11, rec.hora_12,
          rec.hora_13, rec.hora_14, rec.hora_15, rec.hora_16,
          rec.hora_17, rec.hora_18, rec.hora_19, rec.hora_20,
          rec.hora_21, rec.hora_22, rec.hora_23, rec.hora_24,
          rec.total, rec.fecha, rec.tipo_fecha, rec.file_type,
        ];
        const { rows: existing } = await client.query(checkSQL, [rec.fecha]);
        if (existing.length > 0) {
          await client.query(updateSQL, vals);
          updated++;
        } else {
          await client.query(insertSQL, vals);
          inserted++;
        }
      } catch (err) {
        errors++;
        Logger.error(colors.red(`Error en fecha ${rec.fecha}: ${err.message}`));
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }

  return { inserted, updated, errors };
}

export default class AdemService {
  static instance;

  static getInstance() {
    if (!AdemService.instance) {
      AdemService.instance = new AdemService();
    }
    return AdemService.instance;
  }

  async cargarAdemZip(zipPath, zipName) {
    const AdmZip = (await import("adm-zip")).default;

    // Extraer en directorio temporal
    const extractDir = path.join(os.tmpdir(), `adem_${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractDir, true);

      Logger.info(colors.cyan(`[ADEM] ZIP extraído en ${extractDir}`));

      const { year, structure, files } = discoverAdemFiles(extractDir);
      Logger.info(colors.cyan(`[ADEM] Año detectado: ${year} — Estructura: ${structure} — ${files.length} archivos`));

      const holidays = colombianHolidays(year);
      const records = [];
      const fileErrors = [];

      for (const { filePath, mmdd, fileType, mm: monthMM } of files) {
        try {
          const parsed = parseAdemFile(filePath);

          for (const horasRec of parsed) {
            let fecha;
            if (horasRec._fecha) {
              fecha = horasRec._fecha;
            } else {
              const mm = mmdd.slice(0, 2);
              const dd = mmdd.slice(2, 4);
              fecha = `${year}-${mm}-${dd}`;
            }
            const tipo_fecha = parseTipofecha(fecha, holidays);
            const { _fecha, ...horas } = horasRec;
            records.push({ ...horas, fecha, tipo_fecha, file_type: fileType });
          }
        } catch (err) {
          const msg = `${path.basename(filePath)}: ${err.message}`;
          Logger.error(colors.yellow(`[ADEM] Saltando — ${msg}`));
          fileErrors.push(msg);
        }
      }

      if (records.length === 0) {
        throw new Error(
          `No se pudo procesar ningún archivo. Errores (${fileErrors.length}):\n` +
          fileErrors.slice(0, 5).join("\n")
        );
      }

      const { inserted, updated, errors } = await upsertDemandRecords(records);

      return {
        success: true,
        year,
        structure,
        total_files: files.length,
        records_processed: records.length,
        records_saved: inserted + updated,
        inserted,
        updated,
        errors,
        message: `Año ${year}: ${inserted} insertados, ${updated} actualizados, ${errors} errores.`,
      };
    } finally {
      // Limpiar archivos temporales
      fs.rmSync(extractDir, { recursive: true, force: true });
      fs.rmSync(zipPath, { force: true });
    }
  }
}