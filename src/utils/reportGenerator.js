// utils/reportGenerator.js
import fs from "fs";
import path from "path";
import moment from "moment";
import ExcelJS from "exceljs";

/**
 * Genera TXT y XLSX de pronóstico y guarda en disco.
 *
 * @param {Object[]} records Array de objetos [{ fecha: 'YYYY-MM-DD' , p1..p24: number }, ...]
 *                              - records debe estar ordenado por fecha asc. Si no lo está, se ordena.
 * @param {String|Number} mc Identificador del mercado/comercializador (usado en nombre de archivo)
 * @param {String} baseDir Carpeta donde guardar archivos (se creará si no existe)
 * @param {Object} options { truncate: true|false, keepDecimals: false|true }
 * @returns {Object} { txtPath, xlsxPath, txtName, xlsxName }
 */
/**
 * Genera TXT y XLSX directamente en la carpeta destino (folderPhysical)
 * records: array [{ fecha, p1..p24 }]
 * folderPhysical: ruta absoluta donde guardar (existente)
 * fileBaseName no extension (ej 'MCATLANTICOAGT2411')
 */
export async function generateReportsToFolder(
  records = [],
  folderPhysical,
  fileBaseName,
  options = { truncate: true, keepDecimals: true }
) {
  if (!Array.isArray(records) || records.length === 0)
    throw new Error("No hay registros para generar reporte.");

  if (!fs.existsSync(folderPhysical))
    fs.mkdirSync(folderPhysical, { recursive: true });

  const { truncate = true, keepDecimals = true } = options;

  const txtName = `${fileBaseName}.txt`;
  const xlsxName = `${fileBaseName}.xlsx`;
  const txtPath = path.join(folderPhysical, txtName);
  const xlsxPath = path.join(folderPhysical, xlsxName);

  // === TXT (igual que antes) ===
  const days = records.length;
  const txtLines = [];
  for (let p = 1; p <= 24; p++) {
    const cols = [p.toString()];
    for (let d = 0; d < days; d++) {
      const rec = records[d] || {};
      let val =
        rec[`p${p}`] != null
          ? Number(String(rec[`p${p}`]).replace(",", "."))
          : 0;
      if (!keepDecimals) {
        if (truncate) val = Math.trunc(val);
        else val = Math.round(val);
      }
      cols.push(String(val));
    }
    txtLines.push(cols.join("\t"));
  }
  fs.writeFileSync(txtPath, txtLines.join("\n"), "utf8");

  // === Preparación para XLSX ===
  const extractUcpFromBase = (base) => {
    if (!base || typeof base !== "string") return null;
    let m = base.match(/^MC([A-Za-zÀ-ÿ0-9]+)AGTE/i);
    if (m && m[1]) return m[1];
    m = base.match(/^([A-Za-zÀ-ÿ0-9]+)AGTE/i);
    if (m && m[1]) return m[1];
    m = base.match(/^MC-?([A-Za-zÀ-ÿ0-9]+)(?:-|_)?/i);
    if (m && m[1]) return m[1];
    return null;
  };
  const capitalizeWords = (s) =>
    String(s || "")
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  const ucpExtracted = extractUcpFromBase(fileBaseName);
  const ucpFinal = ucpExtracted
    ? capitalizeWords(ucpExtracted.replace(/\s+/g, ""))
    : capitalizeWords(fileBaseName.replace(/\s+/g, ""));
  const codAbrevValue = `MC-${ucpFinal}`;

  // preparar rangos por periodo (1..24) para usar en generación aleatoria (segunda pasada)
  const periodRanges = {};
  for (let p = 1; p <= 24; p++) {
    const vals = [];
    for (let d = 0; d < records.length; d++) {
      const raw = records[d] && records[d][`p${p}`];
      if (raw != null) {
        const n = Number(String(raw).replace(",", "."));
        if (!Number.isNaN(n)) vals.push(n);
      }
    }
    if (vals.length === 0) {
      periodRanges[p] = { min: 0, max: 0 };
    } else {
      vals.sort((a, b) => a - b);
      periodRanges[p] = { min: vals[0], max: vals[vals.length - 1] };
    }
  }

  // formateador (igual que antes): devuelve string con coma decimal
  const formatPronosticoForExcel = (raw) => {
    const num = Number(String(raw).replace(",", "."));
    if (Number.isNaN(num)) return "0,0";
    if (keepDecimals) {
      const s = String(num);
      return s.replace(".", ",");
    }
    if (truncate) {
      const t = Math.trunc(num);
      return String(t).replace(".", ",");
    }
    if (Math.abs(num) < 10) {
      return num.toFixed(4).replace(".", ",");
    } else {
      return num.toFixed(1).replace(".", ",");
    }
  };

  // helper random dentro de rango (si min===max devuelve min)
  const randInRange = (min, max) => {
    const val = Math.random() * (max - min) + min;
    return parseFloat(val.toFixed(1)); // <-- DECIMALES LIMITADOS: 1 decimal
  };

  // ordenar registros por fecha asc
  const parseDate = (f) => {
    if (!f) return new Date(0);
    const m = moment(
      f,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    return m.isValid() ? m.toDate() : new Date(f);
  };
  const ordered = Array.isArray(records)
    ? [...records].sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha))
    : records;

  // === Generar XLSX con dos pasadas ===
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pronostico");

  // Header: CodAbrevMC | FECHA | PERIODO | PRONOSTICO | CODIGOCOLECCION
  ws.addRow([
    "CodAbrevMC",
    "FECHA",
    "PERIODO",
    "PRONOSTICO",
    "CODIGOCOLECCION",
  ]);

  // Primera pasada: PROENCNDHMC con valores reales
  for (let d = 0; d < ordered.length; d++) {
    const rec = ordered[d];
    const mDate = moment(
      rec.fecha,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    const fechaFormateada = mDate.isValid()
      ? mDate.format("DD/MM/YYYY")
      : String(rec.fecha);

    for (let p = 1; p <= 24; p++) {
      const raw = rec[`p${p}`];
      const pron = formatPronosticoForExcel(raw);
      ws.addRow([codAbrevValue, fechaFormateada, p, pron, "PROENCNDHMC"]);
    }
  }

  // Segunda pasada: PROPOTCNDHMC con valores 0 excepto periodos 19,20,21 -> aleatorios dentro del rango observado
  for (let d = 0; d < ordered.length; d++) {
    const rec = ordered[d];
    const mDate = moment(
      rec.fecha,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    const fechaFormateada = mDate.isValid()
      ? mDate.format("DD/MM/YYYY")
      : String(rec.fecha);

    for (let p = 1; p <= 24; p++) {
      let valueToWrite = 0;
      if (p === 19 || p === 20 || p === 21) {
        const { min, max } = periodRanges[p] || { min: 0, max: 0 };
        // generar valor aleatorio dentro de rango
        const rnd = randInRange(min, max);
        valueToWrite = rnd;
      }
      const pron = formatPronosticoForExcel(valueToWrite);
      ws.addRow([codAbrevValue, fechaFormateada, p, pron, "PROPOTCNDHMC"]);
    }
  }

  // Ajustes de columnas
  ws.columns = [
    { key: "cod", width: 18 },
    { key: "fecha", width: 14 },
    { key: "periodo", width: 10 },
    { key: "pron", width: 14 },
    { key: "col", width: 18 },
  ];

  ws.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle", horizontal: "left" };
      if (rowNumber === 1) cell.font = { bold: true };
      // la columna PRONOSTICO ya es string formateada con coma; la dejamos así.
    });
  });

  await wb.xlsx.writeFile(xlsxPath);

  return { txtPath, xlsxPath, txtName, xlsxName };
}

/**
 * Inserta un registro en la tabla 'archivos'
 * Tabla columnas: codigo (serial PK), nombrearchivo, path, contenttype
 *
 * @param {import('pg').Client|import('pg').PoolClient} client - cliente pg ya conectado
 * @param {Object} params
 * @param {string} params.nombreArchivo - nombre del archivo (ej. MCATLANTICOAGT1907.txt)
 * @param {string} params.rutaArchivo - ruta absoluta en disco o url (ej. /var/www/reportes/...)
 * @param {number} params.codcarpeta - id de la carpeta en tu sistema
 * @param {string|null} params.contentType - mime type opcional; si no se pasa se intenta inferir
 * @returns {Object} fila insertada { codigo: <id> }
 */
export async function insertFileRecord(client, params = {}) {
  const { nombreArchivo, rutaArchivo, codcarpeta, contentType = null } = params;

  if (!client) throw new Error("insertFileRecord: client de BD requerido");
  if (!nombreArchivo || !rutaArchivo)
    throw new Error(
      "insertFileRecord: nombreArchivo y rutaArchivo son obligatorios"
    );

  const ext = path.extname(nombreArchivo || "").toLowerCase();
  let inferred = contentType;
  if (!inferred) {
    if (ext === ".xlsx" || ext === ".xls")
      inferred =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    else if (ext === ".txt") inferred = "text/plain";
    else if (ext === ".csv") inferred = "text/csv";
    else inferred = null;
  }

  const q = `
    INSERT INTO archivos (codcarpeta, nombrearchivo, path)
    VALUES ($1, $2, $3)
    RETURNING codigo;
  `;
  const vals = [codcarpeta, nombreArchivo, rutaArchivo];

  const r = await client.query(q, vals);
  return r.rows && r.rows[0] ? r.rows[0] : null;
}
