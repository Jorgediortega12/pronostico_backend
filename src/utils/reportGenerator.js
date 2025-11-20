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
export async function generateAndSaveReports(
  records = [],
  mc = "MC",
  baseDir = "./reportes",
  options = {}
) {
  const { truncate = true, keepDecimals = false } = options;

  // Validaciones mínimas
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("No hay registros para generar reporte (records vacio).");
  }

  // Normalizar y ordenar por fecha (intenta varios formatos)
  const parseDate = (f) => {
    if (!f) return new Date(0);
    const m = moment(
      f,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    return m.isValid() ? m.toDate() : new Date(f);
  };
  records.sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha));

  // Asegurar carpeta
  const folder = path.resolve(baseDir, `MC${mc}`);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const timestamp = moment().format("YYYYMMDD_HHmmss");
  const txtName = `MC${mc}_PRONOSTICO_${timestamp}.txt`;
  const xlsxName = `MC${mc}_PRONOSTICO_${timestamp}.xlsx`;
  const txtPath = path.join(folder, txtName);
  const xlsxPath = path.join(folder, xlsxName);

  // Determinar cantidad de días (columnas) = records.length
  const days = records.length;

  // Construir TXT: 24 líneas (periodo 1..24)
  // Cada linea: periodo \t valor_dia1 \t valor_dia2 \t ... (valores truncados si truncate=true)
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
        // si no quieres decimales, trunca como hacía el C#
        if (truncate) val = Math.trunc(val);
        else val = Math.round(val);
      } else {
        // mantener decimales (pero formatear con punto)
        val = Number(val);
      }
      cols.push(String(val));
    }
    txtLines.push(cols.join("\t"));
  }
  // Escribir txt
  fs.writeFileSync(txtPath, txtLines.join("\n"), "utf8");

  // Construir XLSX con ExcelJS
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pronostico");

  // Header: Periodo + fechas formateadas (usar la propiedad fecha de records)
  const header = ["Periodo", ...records.map((r) => r.fecha || "")];
  ws.addRow(header);

  for (let p = 1; p <= 24; p++) {
    const row = [p];
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
      row.push(val);
    }
    ws.addRow(row);
  }

  // Opcional: ajustar ancho automático simple (aumenta legibilidad)
  ws.columns.forEach((col, i) => {
    // primera columna pequeña, resto más ancha
    col.width = i === 0 ? 10 : 15;
  });

  // Guardar xlsx
  await wb.xlsx.writeFile(xlsxPath);

  return { txtPath, xlsxPath, txtName, xlsxName };
}

/**
 * Inserta un registro en la tabla 'archivos'
 * Tabla columnas: codigo (serial PK), codcarpeta, nombrearchivo, path, contenttype
 *
 * @param {import('pg').Client|import('pg').PoolClient} client - cliente pg ya conectado
 * @param {Object} params
 * @param {string} params.nombreArchivo - nombre del archivo (ej. MCATLANTICOAGT1907.txt)
 * @param {string} params.rutaArchivo - ruta absoluta en disco o url (ej. /var/www/reportes/...)
 * @param {number|null} params.codcarpeta - id de la carpeta en tu sistema (si lo tienes), o null
 * @param {string|null} params.contentType - mime type opcional; si no se pasa se intenta inferir
 * @returns {Object} fila insertada { codigo: <id> }
 */
export async function insertFileRecord(client, params = {}) {
  const {
    nombreArchivo,
    rutaArchivo,
    codcarpeta = null,
    contentType = null,
  } = params;

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
    INSERT INTO archivos (codcarpeta, nombrearchivo, path, contenttype)
    VALUES ($1, $2, $3, $4)
    RETURNING codigo;
  `;
  const vals = [codcarpeta, nombreArchivo, rutaArchivo, inferred];

  const r = await client.query(q, vals);
  return r.rows && r.rows[0] ? r.rows[0] : null;
}
