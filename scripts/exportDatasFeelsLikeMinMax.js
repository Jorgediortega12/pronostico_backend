import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";

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
  return {
    fechaMes: `${anio}-${mes}`,
    fechaDia: `${anio}-${mes}-${dia}`,
  };
};

const fmt2 = (n) =>
  n === null || n === undefined || !isFinite(n)
    ? null
    : parseFloat(n.toFixed(2));

const media = (arr) =>
  arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

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

const procesarDatos = (registros) => {
  console.log(`\n🔄 Procesando registros (solo montería)...`);

  const meses = new Map();

  for (const reg of registros) {
    const cityName = (reg.city_name || "").trim().toLowerCase();
    if (cityName !== "montería") continue;

    const info = extraerInfo(reg.dt_iso, reg.timezone);
    if (!info) {
      console.warn(`⚠️ dt_iso inválido, saltando: ${reg.dt_iso}`);
      continue;
    }

    const { fechaMes, fechaDia } = info;

    if (!meses.has(fechaMes)) {
      meses.set(fechaMes, {
        max: -Infinity,
        min: Infinity,
        vals: [],
        dias: new Set(),
      });
    }

    const acc = meses.get(fechaMes);
    acc.dias.add(fechaDia);

    const fl = parseNumero(reg.feels_like);
    if (fl === null) continue;
    if (fl > acc.max) acc.max = fl;
    if (fl < acc.min) acc.min = fl;
    acc.vals.push(fl);
  }

  const filas = [];

  for (const [fechaMes, acc] of [...meses.entries()].sort()) {
    filas.push({
      fecha: fechaMes,
      feelsLike_Max: fmt2(isFinite(acc.max) ? acc.max : null),
      feelsLike_Med: fmt2(media(acc.vals)),
      feelsLike_Min: fmt2(isFinite(acc.min) ? acc.min : null),
      Tot_mes: acc.dias.size,
    });
  }

  console.log(`✅ Meses procesados: ${filas.length}`);
  return filas;
};

const escribirXLSX = async (filas, rutaSalida) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Feels Like");

  ws.columns = [
    { header: "fecha", key: "fecha", width: 12 },
    { header: "feelsLike_Max", key: "feelsLike_Max", width: 14 },
    { header: "feelsLike_Med", key: "feelsLike_Med", width: 14 },
    { header: "feelsLike_Min", key: "feelsLike_Min", width: 14 },
    { header: "Tot_mes", key: "Tot_mes", width: 10 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE45C2E" },
    };
    cell.alignment = { horizontal: "center" };
  });

  for (const fila of filas) {
    ws.addRow(fila);
  }

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    ["B", "C", "D"].forEach((col) => {
      const cell = row.getCell(col);
      if (cell.value !== null) cell.numFmt = "0.00";
    });
  });

  await wb.xlsx.writeFile(rutaSalida);
  console.log(`\n💾 Archivo Excel generado: ${rutaSalida}`);
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("❌ Debe indicar el archivo CSV de entrada");
    console.log("   Uso: node exportFeelsLike.js archivo.csv [salida.xlsx]");
    process.exit(1);
  }

  const rutaEntrada = path.resolve(args[0]);
  const rutaSalida = args[1]
    ? path.resolve(args[1])
    : rutaEntrada.replace(/\.csv$/i, "_feelslike.xlsx");

  try {
    const registros = leerCSV(rutaEntrada);
    const filas = procesarDatos(registros);
    await escribirXLSX(filas, rutaSalida);
    console.log("\n🎉 ¡Proceso completado exitosamente!");
  } catch (err) {
    console.error("❌ Error fatal:", err.message);
    process.exit(1);
  }
};

main();
