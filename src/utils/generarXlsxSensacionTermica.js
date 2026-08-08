import ExcelJS from "exceljs";

const CAMPOS_TEMPERATURA = Array.from(
  { length: 24 },
  (_, i) => `p${i + 1}_t`,
);

// Min/media/máx del día a partir de los 24 periodos horarios de temperatura
// (p1_t..p24_t de datos_clima) — se usan como la "sensación térmica" del día.
const calcularMinMediaMax = (fila) => {
  const valores = CAMPOS_TEMPERATURA.map((campo) => fila[campo])
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map(Number)
    .filter((v) => !Number.isNaN(v));
  if (valores.length === 0) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  return { min, media, max };
};

const redondear = (v) => Math.round(v * 100) / 100;

// pg devuelve las columnas DATE como Date en medianoche LOCAL — al pasarlas
// tal cual a ExcelJS (que serializa en UTC) queda un residuo de horas si el
// servidor no corre en UTC. Se reconstruye en medianoche UTC usando los
// componentes de calendario (ya correctos) para que el serial de Excel
// quede limpio, sin parte fraccionaria.
const fechaLimpia = (fecha) => {
  const d = new Date(fecha);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

// Nombre de hoja válido en Excel: máx 31 caracteres, sin : \ / ? * [ ]
const nombreHojaValido = (nombre, usados) => {
  let base = String(nombre || "Mercado")
    .replace(/[:\\/?*[\]]/g, " ")
    .trim()
    .slice(0, 31);
  if (!base) base = "Mercado";
  let final = base;
  let i = 2;
  while (usados.has(final)) {
    final = `${base.slice(0, 28)} ${i}`;
    i++;
  }
  usados.add(final);
  return final;
};

export async function generarXlsxSensacionTermica(datosPorMercado) {
  const wb = new ExcelJS.Workbook();
  const nombresUsados = new Set();

  for (const [mercado, filas] of Object.entries(datosPorMercado)) {
    const ws = wb.addWorksheet(nombreHojaValido(mercado, nombresUsados));
    ws.columns = [
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Sensación térmica mínima (°C)", key: "min", width: 28 },
      { header: "Sensación térmica media (°C)", key: "media", width: 28 },
      { header: "Sensación térmica máxima (°C)", key: "max", width: 28 },
    ];
    ws.getRow(1).font = { bold: true };

    const filasOrdenadas = [...filas].sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha),
    );

    for (const fila of filasOrdenadas) {
      const calc = calcularMinMediaMax(fila);
      if (!calc) continue;
      const row = ws.addRow({
        fecha: fechaLimpia(fila.fecha),
        min: redondear(calc.min),
        media: redondear(calc.media),
        max: redondear(calc.max),
      });
      row.getCell("fecha").numFmt = "dd/mm/yyyy";
    }

    if (ws.rowCount === 1) {
      ws.addRow(["Sin datos en el rango seleccionado"]);
    }
  }

  return wb.xlsx.writeBuffer();
}
