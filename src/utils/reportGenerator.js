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

  // -----------------------------------------------------------------------
  // ORDENAR FECHAS
  // -----------------------------------------------------------------------
  const parseDate = (f) => {
    if (!f) return new Date(0);
    const m = moment(
      f,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    return m.isValid() ? m.toDate() : new Date(f);
  };

  const ordered = [...records].sort(
    (a, b) => parseDate(a.fecha) - parseDate(b.fecha)
  );

  // -----------------------------------------------------------------------
  // TXT — FORMATO ESPECIAL (SEMANAL)
  // -----------------------------------------------------------------------

  // Tomar PRIMEROS 7 días
  const daysToUse = 7;
  const first7 = ordered.slice(0, daysToUse);
  while (first7.length < daysToUse) first7.push(null); // rellenar si faltan

  // Nombre UCP desde fileBaseName
  const extractUcp = (base) => {
    if (!base) return "MC";
    let m = base.match(/^MC-?([A-Za-z0-9]+)/i);
    if (m && m[1]) return m[1];
    m = base.match(/^([A-Za-z0-9]+)AGTE/i);
    if (m && m[1]) return m[1];
    return base;
  };

  const ucpPretty = extractUcp(fileBaseName)
    .replace(/_/g, " ")
    .replace(/-/g, " ");
  const ucpPrettyClean = ucpPretty.charAt(0).toUpperCase() + ucpPretty.slice(1);

  // Fecha para encabezado "SEMANA DEL ..."
  const firstDate = first7.find((x) => x)?.fecha || ordered[0].fecha;
  const monthsES = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];
  let headerWeekDate = "";
  {
    const md = moment(
      firstDate,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    if (md.isValid()) {
      headerWeekDate = `${md.format("DD")} DE ${
        monthsES[Number(md.format("M")) - 1]
      } DE ${md.format("YYYY")}`;
    } else headerWeekDate = firstDate;
  }

  const headerLine = `$ PRONOSTICO DEL MC ${ucpPrettyClean} SEMANA DEL ${headerWeekDate}`;

  // Crear matriz 24x7
  const matrix = Array.from({ length: 24 }, () => Array(7).fill(0));

  for (let d = 0; d < 7; d++) {
    const rec = first7[d];
    if (!rec) continue;
    for (let p = 1; p <= 24; p++) {
      let v = Number(String(rec[`p${p}`] ?? 0).replace(",", "."));
      if (!keepDecimals) {
        if (truncate) v = Math.trunc(v);
        else v = Math.round(v);
      } else {
        v = Math.trunc(v); // TXT solo usa enteros
      }
      matrix[p - 1][d] = v;
    }
  }

  // Rango para aleatorios en los periodos 19–21
  const randInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const fillRows = {};
  [19, 20, 21].forEach((p) => {
    const arr = matrix[p - 1];
    const mins = Math.min(...arr);
    const maxs = Math.max(...arr);
    fillRows[p] = Array.from({ length: 7 }, () => randInt(mins, maxs));
  });

  // Construcción TXT
  const txtLines = [headerLine];

  // Filas normales 1–24
  for (let p = 1; p <= 24; p++) {
    txtLines.push(`${p}\t${matrix[p - 1].join("\t")}`);
  }

  // Filas adicionales (19–21)
  [19, 20, 21].forEach((p) => {
    txtLines.push(`${p}\t${fillRows[p].join("\t")}`);
  });

  // Escribir TXT
  fs.writeFileSync(txtPath, txtLines.join("\n"), "utf8");

  // -----------------------------------------------------------------------
  //  EXCEL (NO SE TOCA — EXACTO COMO LO TENÍAS)
  // -----------------------------------------------------------------------

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

  // Rango para EXCEL segunda pasada
  const periodRanges = {};
  for (let p = 1; p <= 24; p++) {
    const nums = records
      .map((r) => Number(String(r[`p${p}`] ?? 0).replace(",", ".")))
      .filter((n) => !isNaN(n));
    periodRanges[p] = {
      min: Math.min(...nums),
      max: Math.max(...nums),
    };
  }

  const randInRange = (min, max) =>
    parseFloat((Math.random() * (max - min) + min).toFixed(1));

  const formatPron = (raw) => {
    const n = Number(String(raw).replace(",", "."));
    return String(n).replace(".", ",");
  };

  // === Crear Excel
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pronostico");

  ws.addRow([
    "CodAbrevMC",
    "FECHA",
    "PERIODO",
    "PRONOSTICO",
    "CODIGOCOLECCION",
  ]);

  // PROENCNDHMC
  for (const rec of ordered) {
    const fd = moment(
      rec.fecha,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    const fecha = fd.isValid() ? fd.format("DD/MM/YYYY") : rec.fecha;

    for (let p = 1; p <= 24; p++) {
      const pron = formatPron(rec[`p${p}`] ?? 0);
      ws.addRow([codAbrevValue, fecha, p, pron, "PROENCNDHMC"]);
    }
  }

  // PROPOTCNDHMC
  for (const rec of ordered) {
    const fd = moment(
      rec.fecha,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    const fecha = fd.isValid() ? fd.format("DD/MM/YYYY") : rec.fecha;

    for (let p = 1; p <= 24; p++) {
      let val = 0;
      if (p === 19 || p === 20 || p === 21) {
        const { min, max } = periodRanges[p];
        val = randInRange(min, max);
      }
      const pron = formatPron(val);
      ws.addRow([codAbrevValue, fecha, p, pron, "PROPOTCNDHMC"]);
    }
  }

  ws.columns = [
    { width: 18 },
    { width: 14 },
    { width: 10 },
    { width: 14 },
    { width: 18 },
  ];

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
