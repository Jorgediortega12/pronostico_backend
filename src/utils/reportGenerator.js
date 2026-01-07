// utils/reportGenerator.js
import fs from "fs";
import path from "path";
import moment from "moment";
import ExcelJS from "exceljs";

/**
 * @param {Object} params
 * @param {Array} params.pronosticoList  // [{ fecha, p1..p24 }, ...]
 * @param {string} params.ucp
 * @param {string} params.fecha_inicio
 * @param {string} params.fecha_fin
 * @param {string} params.folderPhysical  // ruta absoluta (se crea si no existe)
 * @param {string} params.fileBaseName    // sin extension
 * @param {Object} params.configuracionModel // model con cargarDiasPotencias / buscarPotenciaDia / buscarDiaFestivo opcionales
 * @param {Object} [params.options]       // { truncate: true, keepDecimals: true } (no usado intensamente aquí)
 * @returns {Object} { xlsxPath, xlsxName }
 */

export async function generateTxtToFolder({
  pronosticoList = [], // array [{ fecha, p1..p24 }, ...] (puede venir desordenado)
  ucp,
  fecha_inicio, // string (ej "2025-11-01")
  fecha_fin, // string (ej "2025-11-07")
  folderPhysical, // carpeta absoluta existente o se crea
  fileBaseName, // sin extension
  configuracionModel, // obj con métodos cargarDiasPotencias, buscarDiaFestivo
}) {
  if (!Array.isArray(pronosticoList)) pronosticoList = [];
  if (!fs.existsSync(folderPhysical))
    fs.mkdirSync(folderPhysical, { recursive: true });

  // ---------- calcular numdias (igual que .NET)
  const startDT = moment(
    fecha_inicio,
    ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY"],
    true
  );
  const endDT = moment(
    fecha_fin,
    ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY"],
    true
  );
  const totalDays =
    startDT.isValid() && endDT.isValid() ? endDT.diff(startDT, "days") : null;

  let numdias = 7;
  if (totalDays !== null && totalDays < 7) numdias = totalDays + 1;

  // ---------- determinar stopDate (último lunes entre start..end) como en .NET
  let stopDate = null;
  if (startDT.isValid() && endDT.isValid()) {
    for (let dt = startDT.clone(); dt.isBefore(endDT); dt.add(1, "day")) {
      if (dt.isoWeekday() === 1) {
        // Monday -> 1 (isoWeekday)
        stopDate = dt.clone();
      }
    }
  }
  // fallback: si no hallamos Monday, usar startDT
  if (!stopDate)
    stopDate = startDT.isValid() ? startDT.clone() : moment().startOf("day");

  // ---------- ordenar pronostico por fecha asc (normalizamos parseos)
  const parseDate = (f) => {
    if (!f) return null;
    const m = moment(
      f,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    return m.isValid() ? m : moment(f); // fallback
  };
  const ordered = [...pronosticoList].sort((a, b) => {
    const ma = parseDate(a.fecha);
    const mb = parseDate(b.fecha);
    if (!ma || !mb) return 0;
    return ma.valueOf() - mb.valueOf();
  });

  // ---------- construir arrUltimaFecha (últimos numdias del pronóstico, en formato dd-MM-YYYY)
  // En .NET llenaban desde el final. Hacemos lo mismo.
  const arrUltimaFecha = [];
  for (
    let k = ordered.length - 1;
    k >= 0 && arrUltimaFecha.length < numdias;
    k--
  ) {
    const rec = ordered[k];
    const m = parseDate(rec.fecha);
    if (m && m.isValid()) arrUltimaFecha.push(m.format("DD-MM-YYYY"));
    else arrUltimaFecha.push(String(rec.fecha));
  }
  // si faltan, se quedan con menos; en .NET rellenaban nulos pero luego usan lo que hay
  // Convertir arrUltimaFecha a listDate (Date objects) y ordenarlas asc
  const listDate = arrUltimaFecha
    .map((s) => {
      const parts = String(s).split("-");
      if (parts.length === 3) {
        // dd-MM-yyyy
        return moment(`${parts[2]}-${parts[1]}-${parts[0]}`, "YYYY-MM-DD");
      }
      const m = parseDate(s);
      return m && m.isValid() ? m.clone() : null;
    })
    .filter((x) => x !== null)
    .sort((a, b) => a.valueOf() - b.valueOf());

  // ---------- Cabecera: "$ PRONOSTICO DEL MC {ucp} SEMANA DEL {dd} DE {MES EN MAYUS} DE {YYYY}"
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
  const headerWeekDate =
    listDate.length > 0
      ? `${listDate[0].format("DD")} DE ${
          monthsES[Number(listDate[0].format("M")) - 1]
        } DE ${listDate[0].format("YYYY")}`
      : `${moment().format("DD")} DE ${
          monthsES[moment().month()]
        } DE ${moment().year()}`;
  const headerLine = `$ PRONOSTICO DEL MC ${ucp} SEMANA DEL ${stopDate.format(
    "DD"
  )} DE ${monthsES[Number(stopDate.format("M")) - 1]} DE ${stopDate.format(
    "YYYY"
  )}`;

  // ---------- construir matrix 24 x numdias con valores truncados (igual a C# Math.Truncate)
  const matrix = Array.from({ length: 24 }, () => Array(numdias).fill(0));
  for (let d = 0; d < listDate.length && d < numdias; d++) {
    const mdate = listDate[d];
    const rec = ordered.find((r) => {
      const rdate = parseDate(r.fecha);
      return (
        rdate &&
        rdate.isValid() &&
        rdate.format("DD-MM-YYYY") === mdate.format("DD-MM-YYYY")
      );
    });
    if (!rec) continue;
    for (let p = 1; p <= 24; p++) {
      let v = Number(String(rec[`p${p}`] ?? 0).replace(",", "."));
      if (isNaN(v)) v = 0;
      matrix[p - 1][d] = Math.trunc(v); // TXT usa enteros truncados
    }
  }

  // ---------- crear contenido TXT
  const txtLines = [];
  txtLines.push(headerLine);

  // filas 1..24
  for (let p = 1; p <= 24; p++) {
    const row = [String(p)];
    for (let d = 0; d < numdias; d++) {
      // si no existe valor (listDate más corto) -> 0
      const v = matrix[p - 1][d] ?? 0;
      row.push(String(v));
    }
    txtLines.push(row.join("\t"));
  }

  // ---------- POTENCIAS: usar configuracionModel.cargarDiasPotencias(ucp)
  if (
    !configuracionModel ||
    typeof configuracionModel.cargarDiasPotencias !== "function"
  ) {
    // Si no existe el model, simplemente no agregamos potencias (o podrías lanzar)
    // Para compatibilidad, dejamos que la función siga y devuelva TXT sin potencias.
  } else {
    const potenciaRows = await configuracionModel.cargarDiasPotencias(ucp);
    // potenciaRows esperado: array de objetos [{ dia: '1', potencia1: 100, potencia2: 80, ... }, ...]
    if (Array.isArray(potenciaRows) && potenciaRows.length > 0) {
      for (let k = 0; k < potenciaRows.length; k++) {
        const prow = potenciaRows[k];
        const diaPeriodo = Number(prow.dia); // periodo al que se refiere la potencia (1..24)
        const linea = [String(diaPeriodo)];
        // para cada fecha en listDate (hasta numdias)
        for (let d = 0; d < listDate.length && d < numdias; d++) {
          const mdate = listDate[d];
          // Buscar registro pronosticado de esa fecha
          const rec = ordered.find((r) => {
            const rdate = parseDate(r.fecha);
            return (
              rdate &&
              rdate.isValid() &&
              rdate.format("DD-MM-YYYY") === mdate.format("DD-MM-YYYY")
            );
          });
          if (!rec) {
            linea.push("0");
            continue;
          }
          // valor del periodo en el pronóstico
          let vPeriodo = Number(
            String(rec[`p${diaPeriodo}`] ?? 0).replace(",", ".")
          );
          if (isNaN(vPeriodo)) vPeriodo = 0;

          // buscar si es festivo: configuracionModel.buscarDiaFestivo(fecha, ucp)
          let isFestivo = false;
          if (typeof configuracionModel.buscarDiaFestivo === "function") {
            const ff = await configuracionModel.buscarDiaFestivo(
              mdate.format("YYYY-MM-DD"),
              ucp
            );
            if (ff) isFestivo = true;
          }
          // determinar columna potenciaX a usar según día de la semana
          // isoWeekday: 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab, 7=Dom
          // Tabla BD:   potencia1=Dom, potencia2=Lun, potencia3=Mar, potencia4=Mie, potencia5=Jue, potencia6=Vie, potencia7=Sab
          const diaSemanaIndex = mdate.isoWeekday(); // 1..7 (Mon..Sun)
          const potenciaColName = isFestivo
            ? `potencia1`
            : diaSemanaIndex === 7
              ? `potencia1`
              : `potencia${diaSemanaIndex + 1}`;
          // obtener valor vPotencia
          let vPotencia = 0;
          if (prow && prow[potenciaColName] != null) {
            vPotencia = Number(String(prow[potenciaColName]).replace(",", "."));
            if (isNaN(vPotencia) || vPotencia === 0) {
              // si potencia inválida, dejamos 0 y resultará en 0
              vPotencia = 0;
            }
          }
          // calcular tPotencia = vPeriodo / vPotencia  (si vPotencia==0 => 0)
          let tPotencia = 0;
          if (vPotencia !== 0) tPotencia = vPeriodo / vPotencia;
          linea.push(String(Math.trunc(tPotencia)));
        }
        txtLines.push(linea.join("\t"));
      }
    }
  }

  // ---------- escribir archivo
  const txtName = `${fileBaseName}.txt`;
  const txtPath = path.join(folderPhysical, txtName);
  fs.writeFileSync(txtPath, txtLines.join("\n"), "utf8");

  return { txtPath, txtName };
}

/**
 * generateXlsxToFolder
 * Genera el XLSX (PROENCNDHMC + PROPOTCNDHMC) en folderPhysical usando los mismos días que el TXT.
 *
 * @param {Object} params
 * @param {Array} params.pronosticoList  // [{ fecha, p1..p24 }, ...]
 * @param {string} params.ucp
 * @param {string} params.fecha_inicio
 * @param {string} params.fecha_fin
 * @param {string} params.folderPhysical  // ruta absoluta (se crea si no existe)
 * @param {string} params.fileBaseName    // sin extension
 * @param {Object} params.configuracionModel // model con cargarDiasPotencias / buscarPotenciaDia / buscarDiaFestivo opcionales
 * @param {Object} [params.options]       // { truncate: true, keepDecimals: true } (no usado intensamente aquí)
 * @returns {Object} { xlsxPath, xlsxName }
 */

export async function generateXlsxToFolder({
  pronosticoList = [],
  ucp,
  fecha_inicio,
  fecha_fin,
  folderPhysical,
  fileBaseName,
  configuracionModel,
  options = { truncate: true, keepDecimals: true },
  codigoColeccionEnergia = "PROENCNDHMC",
  codigoColeccionPotencia = "PROPOTCNDHMC",
}) {
  if (!Array.isArray(pronosticoList)) pronosticoList = [];
  if (!fs.existsSync(folderPhysical))
    fs.mkdirSync(folderPhysical, { recursive: true });

  const xlsxName = `${fileBaseName}.xlsx`;
  const xlsxPath = path.join(folderPhysical, xlsxName);

  // helpers
  const parseMoment = (f) => {
    if (!f) return null;
    const m = moment(
      f,
      ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    return m.isValid() ? m : moment(f);
  };

  const roundDotNet = (v) => {
    if (v === null || v === undefined || isNaN(v)) return 0;
    const n = Number(v);
    if (Math.abs(n) < 10) return Number(n.toFixed(4));
    return Number(n.toFixed(1));
  };

  const toExcelDate = (m) => {
    if (!m) return null;
    if (moment.isMoment(m)) return m.toDate();
    const mm = parseMoment(m);
    return mm && mm.isValid() ? mm.toDate() : null;
  };

  // ordenar pronostico por fecha asc
  const ordered = [...pronosticoList].sort((a, b) => {
    const ma = parseMoment(a.fecha);
    const mb = parseMoment(b.fecha);
    if (!ma || !mb) return 0;
    return ma.valueOf() - mb.valueOf();
  });

  // ultimos 7
  const daysToUse = 7;
  const last7 = ordered.slice(-daysToUse); // ← Cambia aquí: slice(-7) toma los últimos 7
  const listDateMoment = last7
    .map((r) => (r ? parseMoment(r.fecha) : null))
    .filter((m) => m && m.isValid());

  // Extraer codAbrev (misma lógica que en tu generator)
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
    : capitalizeWords(String(fileBaseName).replace(/\s+/g, ""));
  const codAbrevValue = `MC-${ucpFinal}`;

  // PRELOAD potencias: intentar cargar con cargarDiasPotencias o buscarPotenciaDia
  const potenciasMapByPeriod = {}; // { "1": { potencia1, potencia2, ... }, ... }
  try {
    if (configuracionModel) {
      if (typeof configuracionModel.buscarPotenciaDia === "function") {
        // fetch per period 1..24
        for (let p = 1; p <= 24; p++) {
          try {
            const res = await configuracionModel.buscarPotenciaDia(
              ucp,
              String(p)
            );
            const rec = res && res.rows ? res.rows[0] : res;
            if (rec) potenciasMapByPeriod[String(p)] = rec;
            else potenciasMapByPeriod[String(p)] = null;
          } catch (err) {
            potenciasMapByPeriod[String(p)] = null;
          }
        }
      } else if (typeof configuracionModel.cargarDiasPotencias === "function") {
        const carg = await configuracionModel.cargarDiasPotencias(ucp);
        const arr = carg && carg.rows ? carg.rows : carg || [];
        for (const r of arr) {
          if (!r) continue;
          const dia = String(
            r.dia || r.DIA || r.periodo || r.period || r.periodo_id || r.PERIODO
          );
          potenciasMapByPeriod[dia] = r;
        }
      }
    }
  } catch (err) {
    // no bloquear; si falla dejamos potenciasMapByPeriod vacío
  }

  // crear workbook
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("VECTORIAL");

  // header row
  ws.addRow([
    "CodAbrevMC",
    "FECHA",
    "PERIODO",
    "PRONOSTICO",
    "CODIGOCOLECCION",
  ]);
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.alignment = { vertical: "middle" };

    cell.font = {
      color: { argb: "FFFFFFFF" }, // letras blancas
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7A7A7A" }, // fondo #7A7A7A
    };
  });

  // === PROENCNDHMC (para cada fecha válida en listDateMoment)
  for (const mDate of listDateMoment) {
    const fechaStrSlash = mDate.format("DD/MM/YYYY");
    // buscar registro pronostico para esa fecha
    const rec = ordered.find((r) => {
      const rm = parseMoment(r.fecha);
      return rm && rm.isValid() && rm.format("DD/MM/YYYY") === fechaStrSlash;
    });

    for (let p = 1; p <= 24; p++) {
      if (rec) {
        let raw = Number(String(rec[`p${p}`] ?? 0).replace(",", "."));
        if (isNaN(raw)) raw = 0;
        const rounded = roundDotNet(raw);
        ws.addRow([
          codAbrevValue,
          toExcelDate(mDate),
          p,
          rounded,
          codigoColeccionEnergia,
        ]);
      } else {
        ws.addRow([codAbrevValue, toExcelDate(mDate), p, 0.0, codigoColeccionEnergia]);
      }
    }
  }

  // === PROPOTCNDHMC (potencias / tPotencia)
  for (const mDate of listDateMoment) {
    const fechaStrSlash = mDate.format("DD/MM/YYYY");
    const rec = ordered.find((r) => {
      const rm = parseMoment(r.fecha);
      return rm && rm.isValid() && rm.format("DD/MM/YYYY") === fechaStrSlash;
    });

    for (let p = 1; p <= 24; p++) {
      const potenciaRow = potenciasMapByPeriod[String(p)] || null;

      if (!potenciaRow) {
        // no configurada -> escribir 0
        ws.addRow([codAbrevValue, toExcelDate(mDate), p, 0.0, codigoColeccionPotencia]);
        continue;
      }

      // valor del periodo en pronóstico
      let vPeriodo = 0;
      if (rec) {
        vPeriodo = Number(String(rec[`p${p}`] ?? 0).replace(",", "."));
        if (isNaN(vPeriodo)) vPeriodo = 0;
      }

      // festivo?
      let isFestivo = false;
      if (
        configuracionModel &&
        typeof configuracionModel.buscarDiaFestivo === "function"
      ) {
        try {
          const ff = await configuracionModel.buscarDiaFestivo(
            mDate.format("YYYY-MM-DD"),
            ucp
          );
          if (ff) isFestivo = true;
        } catch (err) {
          isFestivo = false;
        }
      }

      // dia de la semana ISO (1=Mon..7=Sun)
      // isoWeekday: 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab, 7=Dom
      // Tabla BD:   potencia1=Dom, potencia2=Lun, potencia3=Mar, potencia4=Mie, potencia5=Jue, potencia6=Vie, potencia7=Sab
      const diaNumero = mDate.isoWeekday();
      const potenciaColName = isFestivo
        ? "potencia1"
        : diaNumero === 7
          ? "potencia1"
          : `potencia${diaNumero + 1}`;

      // buscar potencia en potenciaRow (case-insensitive)
      let vPotencia = 0;
      if (potenciaRow[potenciaColName] != null) {
        vPotencia = Number(
          String(potenciaRow[potenciaColName]).replace(",", ".")
        );
      } else {
        const altKey = Object.keys(potenciaRow).find(
          (k) => k.toLowerCase() === potenciaColName.toLowerCase()
        );
        if (altKey)
          vPotencia = Number(String(potenciaRow[altKey]).replace(",", "."));
      }
      if (isNaN(vPotencia)) vPotencia = 0;

      let tPotencia = 0;
      if (vPotencia !== 0) tPotencia = vPeriodo / vPotencia;
      const roundedTP = roundDotNet(tPotencia);
      ws.addRow([
        codAbrevValue,
        toExcelDate(mDate),
        p,
        roundedTP,
        codigoColeccionPotencia,
      ]);
    }
  }

  // Ajustes de columnas y formatos
  ws.columns = [
    { width: 18 }, // CodAbrevMC
    { width: 14, style: { numFmt: "dd/mm/yyyy" } }, // FECHA
    { width: 10 }, // PERIODO
    { width: 14 }, // PRONOSTICO
    { width: 18 }, // CODIGOCOLECCION
  ];
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // Guardar archivo
  await wb.xlsx.writeFile(xlsxPath);

  return { xlsxPath, xlsxName };
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
