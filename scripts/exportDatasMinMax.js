import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

const parseNumero = (valor) => {
  if (!valor || String(valor).trim() === "") return null;
  const num = parseFloat(String(valor).replace(",", "."));
  return isNaN(num) ? null : num;
};

const extraerInfo = (dtIso, timezone) => {
  const match = dtIso.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;

  const fechaUTC = new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}Z`);
  const offsetMs = parseInt(timezone) * 1000;
  const fechaLocal = new Date(fechaUTC.getTime() + offsetMs);

  const anio = fechaLocal.getUTCFullYear();
  const mes = String(fechaLocal.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fechaLocal.getUTCDate()).padStart(2, "0");
  const fechaMes = `${anio}-${mes}`;
  const fechaDia = `${anio}-${mes}-${dia}`;
  const diaSemana = fechaLocal.getUTCDay(); // 0=Dom, 6=Sab

  return { fechaMes, fechaDia, diaSemana };
};

const fmt2 = (n) =>
  n === null || n === undefined || !isFinite(n)
    ? null
    : parseFloat(n.toFixed(2));

// ─────────────────────────────────────────────
//  Leer CSV
// ─────────────────────────────────────────────

const leerCSV = (rutaArchivo) => {
  console.log(`\n📄 Leyendo archivo: ${rutaArchivo}`);
  if (!fs.existsSync(rutaArchivo)) {
    throw new Error(`El archivo no existe: ${rutaArchivo}`);
  }
  const contenido = fs.readFileSync(rutaArchivo, "utf-8");
  const registros = parse(contenido, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  console.log(`✅ CSV parseado. Total filas: ${registros.length}`);
  return registros;
};

// ─────────────────────────────────────────────
//  Procesar datos por mes (solo Cartagena)
// ─────────────────────────────────────────────

const procesarDatos = (registros, feriados = new Set()) => {
  console.log(`\n🔄 Procesando registros (solo Cartagena)...`);

  const meses = new Map();
  const arrays = new Map();
  const diasPorMes = new Map();

  for (const reg of registros) {
    // Filtrar solo Cartagena
    const cityName = (reg.city_name || "").trim().toLowerCase();
    if (cityName !== "cartagena") continue;

    const info = extraerInfo(reg.dt_iso, reg.timezone);
    if (!info) {
      console.warn(`⚠️ dt_iso inválido, saltando: ${reg.dt_iso}`);
      continue;
    }

    const { fechaMes, fechaDia, diaSemana } = info;

    if (!meses.has(fechaMes)) {
      meses.set(fechaMes, {
        temp_max: -Infinity,
        temp_min: Infinity,
        hum_max: -Infinity,
        hum_min: Infinity,
        vien_max: -Infinity,
        vien_min: Infinity,
      });
      arrays.set(fechaMes, { temps: [], hums: [], viens: [] });
      diasPorMes.set(fechaMes, new Map());
    }

    const acc = meses.get(fechaMes);
    const arr = arrays.get(fechaMes);
    const diasMap = diasPorMes.get(fechaMes);

    if (!diasMap.has(fechaDia)) {
      diasMap.set(fechaDia, diaSemana);
    }

    // Temperatura: usa temp_max/temp_min del CSV si existen
    const tMax = parseNumero(reg.temp_max) ?? parseNumero(reg.temp);
    const tMin = parseNumero(reg.temp_min) ?? parseNumero(reg.temp);
    const tVal = parseNumero(reg.temp);
    if (tMax !== null && tMax > acc.temp_max) acc.temp_max = tMax;
    if (tMin !== null && tMin < acc.temp_min) acc.temp_min = tMin;
    if (tVal !== null) arr.temps.push(tVal);

    // Humedad
    const hVal = parseNumero(reg.humidity);
    if (hVal !== null) {
      if (hVal > acc.hum_max) acc.hum_max = hVal;
      if (hVal < acc.hum_min) acc.hum_min = hVal;
      arr.hums.push(hVal);
    }

    // Viento
    const vVal = parseNumero(reg.wind_speed);
    if (vVal !== null) {
      if (vVal > acc.vien_max) acc.vien_max = vVal;
      if (vVal < acc.vien_min) acc.vien_min = vVal;
      arr.viens.push(vVal);
    }
  }

  const media = (arr) =>
    arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

  const filas = [];

  for (const [fechaMes, acc] of [...meses.entries()].sort()) {
    const arr = arrays.get(fechaMes);
    const diasMap = diasPorMes.get(fechaMes);

    let totMes = 0,
      totHab = 0,
      totSab = 0,
      totDom = 0,
      totFes = 0;

    for (const [fechaDia, dow] of diasMap.entries()) {
      const esFeriado = feriados.has(fechaDia);
      totMes++;
      if (esFeriado) totFes++;
      else if (dow === 0) totDom++;
      else if (dow === 6) totSab++;
      else totHab++;
    }

    filas.push({
      fecha: fechaMes,
      "demanda (GWh)": null,
      temp_Max: fmt2(isFinite(acc.temp_max) ? acc.temp_max : null),
      temp_Med: fmt2(media(arr.temps)),
      temp_Min: fmt2(isFinite(acc.temp_min) ? acc.temp_min : null),
      hum_Max: fmt2(isFinite(acc.hum_max) ? acc.hum_max : null),
      hum_Med: fmt2(media(arr.hums)),
      hum_Min: fmt2(isFinite(acc.hum_min) ? acc.hum_min : null),
      vien_Max: fmt2(isFinite(acc.vien_max) ? acc.vien_max : null),
      vien_Med: fmt2(media(arr.viens)),
      vien_Min: fmt2(isFinite(acc.vien_min) ? acc.vien_min : null),
      Tot_mes: totMes,
      Tot_Hab: totHab,
      Tot_Sab: totSab,
      Tot_Dom: totDom,
      Tot_Fes: totFes,
    });
  }

  console.log(`✅ Meses procesados: ${filas.length}`);
  return filas;
};

// ─────────────────────────────────────────────
//  Escribir XLSX
// ─────────────────────────────────────────────

const escribirXLSX = async (filas, rutaSalida) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Datos");

  const columnas = [
    { header: "fecha", key: "fecha", width: 12 },
    { header: "demanda (GWh)", key: "demanda (GWh)", width: 14 },
    { header: "temp_Max", key: "temp_Max", width: 10 },
    { header: "temp_Med", key: "temp_Med", width: 10 },
    { header: "temp_Min", key: "temp_Min", width: 10 },
    { header: "hum_Max", key: "hum_Max", width: 10 },
    { header: "hum_Med", key: "hum_Med", width: 10 },
    { header: "hum_Min", key: "hum_Min", width: 10 },
    { header: "vien_Max", key: "vien_Max", width: 10 },
    { header: "vien_Med", key: "vien_Med", width: 10 },
    { header: "vien_Min", key: "vien_Min", width: 10 },
    { header: "Tot_mes", key: "Tot_mes", width: 9 },
    { header: "Tot_Hab", key: "Tot_Hab", width: 9 },
    { header: "Tot_Sab", key: "Tot_Sab", width: 9 },
    { header: "Tot_Dom", key: "Tot_Dom", width: 9 },
    { header: "Tot_Fes", key: "Tot_Fes", width: 9 },
  ];

  ws.columns = columnas;

  // Estilo cabecera
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E75B6" },
    };
    cell.alignment = { horizontal: "center" };
  });

  // Datos
  for (const fila of filas) {
    ws.addRow(fila);
  }

  // Formato numérico 2 decimales para columnas de clima
  const colsNum = ["C", "D", "E", "F", "G", "H", "I", "J", "K"];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    colsNum.forEach((col) => {
      const cell = row.getCell(col);
      if (cell.value !== null) cell.numFmt = "0.00";
    });
  });

  await wb.xlsx.writeFile(rutaSalida);
  console.log(`\n💾 Archivo Excel generado: ${rutaSalida}`);
};

// ─────────────────────────────────────────────
//  Feriados Colombia (ajusta según año/región)
// ─────────────────────────────────────────────

const FERIADOS = new Set([
  "2011-01-01",
  "2011-01-10",
  "2011-03-21",
  "2011-04-21",
  "2011-04-22",
  "2011-05-01",
  "2011-06-06",
  "2011-06-27",
  "2011-07-04",
  "2011-07-20",
  "2011-08-07",
  "2011-08-15",
  "2011-10-17",
  "2011-11-07",
  "2011-11-14",
  "2011-12-08",
  "2011-12-25",
  "2021-01-01",
  "2021-01-11",
  "2021-03-22",
  "2021-04-01",
  "2021-04-02",
  "2021-05-01",
  "2021-05-17",
  "2021-06-07",
  "2021-06-14",
  "2021-06-21",
  "2021-07-20",
  "2021-08-07",
  "2021-08-16",
  "2021-10-18",
  "2021-11-01",
  "2021-11-15",
  "2021-12-08",
  "2021-12-25",
  "2022-01-01",
  "2022-01-10",
  "2022-03-21",
  "2022-04-14",
  "2022-04-15",
  "2022-05-01",
  "2022-05-30",
  "2022-06-20",
  "2022-06-27",
  "2022-07-04",
  "2022-07-20",
  "2022-08-07",
  "2022-08-15",
  "2022-10-17",
  "2022-11-07",
  "2022-11-14",
  "2022-12-08",
  "2022-12-25",
  "2023-01-01",
  "2023-01-09",
  "2023-03-20",
  "2023-04-06",
  "2023-04-07",
  "2023-05-01",
  "2023-05-22",
  "2023-06-12",
  "2023-06-19",
  "2023-07-03",
  "2023-07-20",
  "2023-08-07",
  "2023-08-21",
  "2023-10-16",
  "2023-11-06",
  "2023-11-13",
  "2023-12-08",
  "2023-12-25",
  "2024-01-01",
  "2024-01-08",
  "2024-03-25",
  "2024-03-28",
  "2024-03-29",
  "2024-05-01",
  "2024-05-13",
  "2024-06-03",
  "2024-06-10",
  "2024-07-01",
  "2024-07-20",
  "2024-08-07",
  "2024-08-19",
  "2024-10-14",
  "2024-11-04",
  "2024-11-11",
  "2024-12-08",
  "2024-12-25",
  "2025-01-01",
  "2025-01-06",
  "2025-03-24",
  "2025-04-17",
  "2025-04-18",
  "2025-05-01",
  "2025-06-02",
  "2025-06-23",
  "2025-06-30",
  "2025-07-20",
  "2025-08-07",
  "2025-08-18",
  "2025-10-13",
  "2025-11-03",
  "2025-11-17",
  "2025-12-08",
  "2025-12-25",
]);

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("❌ Debe indicar el archivo CSV de entrada");
    console.log("   Uso: node exportDatasMinMax.js archivo.csv [salida.xlsx]");
    process.exit(1);
  }

  const rutaEntrada = path.resolve(args[0]);
  const rutaSalida = args[1]
    ? path.resolve(args[1])
    : rutaEntrada.replace(/\.csv$/i, "_minmax.xlsx");

  try {
    const registros = leerCSV(rutaEntrada);
    const filas = procesarDatos(registros, FERIADOS);
    await escribirXLSX(filas, rutaSalida);
    console.log("\n🎉 ¡Proceso completado exitosamente!");
  } catch (err) {
    console.error("❌ Error fatal:", err.message);
    process.exit(1);
  }
};

main();
