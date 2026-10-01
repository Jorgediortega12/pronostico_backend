// utils/reportGeneratorDiario.js
// Generador de reporte del pronóstico diario — mucho más simple que
// reportGenerator.js (P1-P24 + potencias, propio del módulo horario): acá
// cada fila es un solo total diario, sin periodos ni potencias.
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";

/**
 * @param {Object} params
 * @param {Array} params.predicciones // [{ fecha, dia_semana, demanda_total, is_festivo, is_weekend }, ...]
 * @param {string} params.ucp
 * @param {string} params.folderPhysical // ruta absoluta (se crea si no existe)
 * @param {string} params.fileBaseName   // sin extensión
 * @returns {Object} { xlsxPath, xlsxName }
 */
export async function generateXlsxDiarioToFolder({
  predicciones = [],
  ucp,
  folderPhysical,
  fileBaseName,
}) {
  if (!fs.existsSync(folderPhysical)) {
    fs.mkdirSync(folderPhysical, { recursive: true });
  }

  const xlsxName = `${fileBaseName}.xlsx`;
  const xlsxPath = path.join(folderPhysical, xlsxName);

  const ordered = [...predicciones].sort((a, b) =>
    String(a.fecha).localeCompare(String(b.fecha)),
  );

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PRONOSTICO_DIARIO");

  ws.addRow(["MC", "FECHA", "DIA", "DEMANDA_TOTAL", "FESTIVO", "FIN_DE_SEMANA"]);
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.alignment = { vertical: "middle" };
    cell.font = { color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7A7A7A" },
    };
  });

  for (const p of ordered) {
    ws.addRow([
      ucp,
      p.fecha,
      p.dia_semana ?? "",
      Number(p.demanda_total ?? 0),
      p.is_festivo ? "Si" : "No",
      p.is_weekend ? "Si" : "No",
    ]);
  }

  ws.columns = [
    { width: 18 },
    { width: 14 },
    { width: 12 },
    { width: 16 },
    { width: 10 },
    { width: 14 },
  ];
  ws.views = [{ state: "frozen", ySplit: 1 }];

  await wb.xlsx.writeFile(xlsxPath);

  return { xlsxPath, xlsxName };
}
