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
  options = { truncate: true, keepDecimals: false }
) {
  if (!Array.isArray(records) || records.length === 0)
    throw new Error("No hay registros para generar reporte.");

  // asegurar carpeta física
  if (!fs.existsSync(folderPhysical))
    fs.mkdirSync(folderPhysical, { recursive: true });

  const { truncate = true, keepDecimals = false } = options;

  const txtName = `${fileBaseName}.txt`;
  const xlsxName = `${fileBaseName}.xlsx`;
  const txtPath = path.join(folderPhysical, txtName);
  const xlsxPath = path.join(folderPhysical, xlsxName);

  // === Construir TXT (igual que antes) ===
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

  // === Preparar valores para XLSX: formato en filas (CodAbrevMC, FECHA, PERIODO, PRONOSTICO) ===

  // helper: intentar extraer UCP desde fileBaseName
  // ejemplo: 'MCAtlanticoAGTE2411' -> captura 'Atlantico'
  const extractUcpFromBase = (base) => {
    if (!base || typeof base !== "string") return null;
    // intentar patrón MC<ucp>AGTE...
    let m = base.match(/^MC([A-Za-zÀ-ÿ0-9]+)AGTE/i);
    if (m && m[1]) return m[1];
    // intentar patrón <ucp>AGTE...
    m = base.match(/^([A-Za-zÀ-ÿ0-9]+)AGTE/i);
    if (m && m[1]) return m[1];
    // fallback: si base empieza con 'MC-' (nuevo estilo), tomar siguiente parte
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
  const codAbrevValue = `MC-${ucpFinal}`; // ejemplo "MC-Atlantico"

  // helper de formateo de pronostico para Excel (string con coma decimal)
  const formatPronosticoForExcel = (raw) => {
    const num = Number(String(raw).replace(",", "."));
    if (Number.isNaN(num)) return "0,0";

    if (keepDecimals) {
      // conservar lo que venga: convertir a string con coma decimal
      // respetar posibles decimales existentes
      const s = String(num);
      return s.replace(".", ",");
    }

    if (truncate) {
      // trunca a entero y muestra sin decimales, pero en C# Excel shows "0,0" for zeros; however user requested values like 760 etc.
      const t = Math.trunc(num);
      return String(t).replace(".", ",");
    }

    // aplicar regla tipo C#: <10 => 4 decimales, >=10 => 1 decimal
    if (Math.abs(num) < 10) {
      return num.toFixed(4).replace(".", ",");
    } else {
      return num.toFixed(1).replace(".", ",");
    }
  };

  // === Generar XLSX ===
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pronostico");

  // Header: CodAbrevMC | FECHA | PERIODO | PRONOSTICO
  ws.addRow(["CodAbrevMC", "FECHA", "PERIODO", "PRONOSTICO"]);

  // records deben estar ordenados por fecha asc; si no lo están, ordenarlos:
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

  for (let d = 0; d < ordered.length; d++) {
    const rec = ordered[d];
    // formatear fecha como dd/MM/YYYY (coincide con convertFechaDiaSlash)
    const mDate = moment(
      rec.fecha,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    const fechaFormateada = mDate.isValid()
      ? mDate.format("DD/MM/YYYY")
      : String(rec.fecha);

    // por cada dia, 24 filas (periodos 1..24)
    for (let p = 1; p <= 24; p++) {
      const raw = rec[`p${p}`];
      const pron = formatPronosticoForExcel(raw);
      // Añadimos como texto para preservar coma decimal; si prefieres número usa parsedNumber
      ws.addRow([codAbrevValue, fechaFormateada, p, pron]);
    }
  }

  // Ajustes de columnas (ancho y estilos)
  ws.columns = [
    { key: "cod", width: 18 },
    { key: "fecha", width: 14 },
    { key: "periodo", width: 10 },
    { key: "pron", width: 14 },
  ];

  ws.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle", horizontal: "left" };
      if (rowNumber === 1) cell.font = { bold: true };
      // Asegurarnos que la columna PRONOSTICO queda como texto (para mantener coma decimal),
      // así no Excel convertirá "856,2" a número (depende del locale del usuario).
      if (colNumber === 4 && rowNumber > 1) {
        // establecer como texto (ExcelJS no tiene type 'string' setter directo, pero podemos coerce by prefixing with ')
        // Evitamos prefixear para mantener limpio; en muchos viewers la celda quedará como string si le pasamos string.
        // Dejar el valor tal cual (string con coma) ya lo añade como string.
      }
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
