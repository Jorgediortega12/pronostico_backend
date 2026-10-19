import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

export async function generateXlsxFactores({
  sumasRef,
  resultadosFdaFdp,
  folderPhysical,
  nombrearchivo,
  selectedSource,
  fechaInicio,
  fechaFin,
  formato = 1,
  barras = [],
}) {
  if (!fs.existsSync(folderPhysical))
    fs.mkdirSync(folderPhysical, { recursive: true });

  if (Number(formato) === 2) {
    return generateXlsxFormato2({
      resultadosFdaFdp,
      folderPhysical,
      nombrearchivo,
      selectedSource,
      barras,
    });
  }

  const xlsxPath = path.join(folderPhysical, nombrearchivo);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Factores");

  const PERIODOS = Array.from({ length: 24 }, (_, i) => `p${i + 1}`);
  const TIPOS_DIA = ["ORDINARIO", "SABADO", "FESTIVO"];
  const LABEL_TD = { ORDINARIO: "ORD", SABADO: "SAB", FESTIVO: "FEST" };
  const r5 = (v) => Math.round((v ?? 0) * 100000) / 100000;
  const r2 = (v) => Math.round((v ?? 0) * 100) / 100;

  const styleMeta = () => ({
    font: { bold: true, size: 10 },
    alignment: { horizontal: "left", vertical: "middle" },
  });

  const styleMW = (isLabel = false) => ({
    font: { bold: isLabel, size: 10 },
    alignment: { horizontal: isLabel ? "left" : "right", vertical: "middle" },
  });

  const styleMVAR = (isLabel = false) => ({
    font: { bold: isLabel, size: 10 },
    alignment: { horizontal: isLabel ? "left" : "right", vertical: "middle" },
  });

  const styleHeader = (isNumber = false) => ({
    font: { bold: true, size: 10 },
    alignment: { horizontal: isNumber ? "center" : "left", vertical: "middle" },
  });

  const styleFactor = (isLabel = false) => ({
    font: { size: 10 },
    alignment: { horizontal: isLabel ? "left" : "right", vertical: "middle" },
  });

  const styleTotal = (isLabel = false) => ({
    font: { bold: true, size: 10 },
    alignment: { horizontal: isLabel ? "left" : "right", vertical: "middle" },
  });

  const applyStyle = (row, stylesFn, isLabels = [false, false, false]) => {
    row.getCell(1).style = stylesFn(isLabels[0]);
    row.getCell(2).style = stylesFn(isLabels[1]);
    row.getCell(3).style = stylesFn(isLabels[2]);
    for (let i = 4; i <= 27; i++) row.getCell(i).style = stylesFn(false);
  };

  // ── Fila helper ──
  const addRow = (ws, values, height = 15) => {
    const row = ws.addRow(values);
    row.height = height;
    return row;
  };

  // ── Anchos de columna ──
  ws.columns = [
    { width: 10 },
    { width: 18 },
    { width: 14 },
    ...Array(24).fill({ width: 8.5 }),
  ];

  // ── Metadatos ──
  const fmtDate = (d) => {
    if (!d) return "";
    const [y, m, day] = String(d).split("-");
    return `${day}/${m}/${y}`;
  };

  const hoy = new Date().toISOString().split("T")[0];
  const rowMC = addRow(
    ws,
    ["$", `MC ${selectedSource}`, ...Array(25).fill(null)],
    16,
  );
  rowMC.eachCell((cell) => {
    cell.style = styleMeta();
  });
  ws.mergeCells(rowMC.number, 2, rowMC.number, 27);

  const rowValidez = addRow(
    ws,
    [
      "$",
      "Fecha Validez Factores:",
      `${fmtDate(fechaInicio)}, ${fmtDate(fechaFin)}`,
      ...Array(24).fill(null),
    ],
    16,
  );
  rowValidez.eachCell((cell) => {
    cell.style = styleMeta();
  });
  ws.mergeCells(rowValidez.number, 3, rowValidez.number, 27);

  const rowPeriodo = addRow(
    ws,
    [
      "$",
      "Periodo Historico:",
      `${fmtDate(fechaInicio)} al ${fmtDate(fechaFin)}`,
      ...Array(24).fill(null),
    ],
    16,
  );
  rowPeriodo.eachCell((cell) => {
    cell.style = styleMeta();
  });
  ws.mergeCells(rowPeriodo.number, 3, rowPeriodo.number, 27);

  // ── BLOQUE 1: MW de Ref + FDA + TOTALFDA ──
  let headerInserted = false;

  for (const td of TIPOS_DIA) {
    const lbl = LABEL_TD[td];
    const refA = sumasRef.find(
      (r) => r.tipo_dia === td && r.tipo_energia === "A",
    );
    const mwVals = PERIODOS.map((p) => r2(refA?.periodos?.[p] ?? 0));

    // MW de Ref
    const rowMw = addRow(ws, ["$", lbl, "MW de Ref", ...mwVals], 15);
    applyStyle(rowMw, styleMW, [true, true, true]);

    // Cabecera — solo una vez tras la primera fila MW
    if (!headerInserted) {
      const headerCells = [
        "$TIPODIA",
        "FACTOR",
        "NODO",
        ...Array.from({ length: 24 }, (_, i) => `P${i + 1}`),
      ];
      const rowH = addRow(ws, headerCells, 18);
      rowH.getCell(1).style = styleHeader(false);
      rowH.getCell(2).style = styleHeader(false);
      rowH.getCell(3).style = styleHeader(false);
      for (let i = 4; i <= 27; i++) rowH.getCell(i).style = styleHeader(true);
      headerInserted = true;
    }

    // Filas FDA
    const fdaRows = resultadosFdaFdp.filter(
      (r) => r.tipoDia === td && r.tipo === "FDA",
    );
    for (const fila of fdaRows) {
      const vals = PERIODOS.map((p) => r5(fila.periodos?.[p] ?? 0));
      const row = addRow(ws, [lbl, "FDA", fila.barra, ...vals], 15);
      applyStyle(row, styleFactor, [true, true, true]);
    }

    // TOTALFDA
    const totalFda = PERIODOS.map((_, i) =>
      r5(fdaRows.reduce((s, f) => s + (f.periodos?.[`p${i + 1}`] ?? 0), 0)),
    );
    const rowTotalFda = addRow(ws, ["$", "TOTALFDA", "", ...totalFda], 15);
    applyStyle(rowTotalFda, styleTotal, [true, true, true]);

    // Separador
    ws.addRow([]).height = 6;
  }

  // ── BLOQUE 2: MVAR + FDP ──
  for (const td of TIPOS_DIA) {
    const lbl = LABEL_TD[td];
    const refR = sumasRef.find(
      (r) => r.tipo_dia === td && r.tipo_energia === "R",
    );
    const mvarVals = PERIODOS.map((p) => r2(refR?.periodos?.[p] ?? 0));

    // MVAR
    const rowMvar = addRow(ws, ["$", lbl, "MVAR", ...mvarVals], 15);
    applyStyle(rowMvar, styleMVAR, [true, true, true]);

    // Filas FDP
    const fdpRows = resultadosFdaFdp.filter(
      (r) => r.tipoDia === td && r.tipo === "FDP",
    );
    for (const fila of fdpRows) {
      const vals = PERIODOS.map((p) => r5(fila.periodos?.[p] ?? 0));
      const row = addRow(ws, [lbl, "FP", fila.barra, ...vals], 15);
      applyStyle(row, styleFactor, [true, true, true]);
    }

    // Separador
    ws.addRow([]).height = 6;
  }

  ws.views = [{ state: "frozen", ySplit: 4 }]; // congela las 3 filas de metadatos + header

  await wb.xlsx.writeFile(xlsxPath);
  return { xlsxPath, xlsxName: nombrearchivo };
}

// ─── Formato 2 — EPM (wdg_Factores) ──────────────────────────────────────────
// Una fila por (tipo de día, barra, factor): FDA y FP intercaladas por barra.
//   FINI | FFIN | CODABREVMC | IDTIPODIA | IDVARIABLE | CONCEPTO | IDBARRA | NOMBREBARRA | P1..P24
// IDBARRA (código EPM, ej. CrgAma11) no existe en la BD del aplicativo: sale vacío.
// Mantener sincronizado con construirFilasFormato2 del frontend
// (generarReporteFactores.ts).
async function generateXlsxFormato2({
  resultadosFdaFdp,
  folderPhysical,
  nombrearchivo,
  selectedSource,
  barras = [],
}) {
  const xlsxPath = path.join(folderPhysical, nombrearchivo);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");

  const PERIODOS = Array.from({ length: 24 }, (_, i) => `p${i + 1}`);
  const r5 = (v) => Math.round((v ?? 0) * 100000) / 100000;
  const ORDEN_TD = [
    ["FESTIVO", "FEST"],
    ["ORDINARIO", "ORD"],
    ["SABADO", "SAB"],
  ];

  ws.addRow([
    "FINI",
    "FFIN",
    "CODABREVMC",
    "IDTIPODIA",
    "IDVARIABLE",
    "CONCEPTO",
    "IDBARRA",
    "NOMBREBARRA",
    ...PERIODOS.map((_, i) => `P${i + 1}`),
  ]);

  // Fechas a medianoche UTC para que Excel muestre el día exacto.
  const hoy = new Date();
  const fini = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  const ffin = new Date(Date.UTC(2999, 11, 31));

  for (const [td, lbl] of ORDEN_TD) {
    const fda = resultadosFdaFdp.filter((r) => r.tipo === "FDA" && r.tipoDia === td);
    const fdp = resultadosFdaFdp.filter((r) => r.tipo === "FDP" && r.tipoDia === td);

    const orden = [];
    barras.forEach((b) => {
      if ((fda.some((f) => f.barra === b) || fdp.some((f) => f.barra === b)) && !orden.includes(b)) orden.push(b);
    });
    [...fda, ...fdp].forEach((f) => {
      if (!orden.includes(f.barra)) orden.push(f.barra);
    });

    for (const barra of orden) {
      // Factor faltante: valor neutro de EPM para barras sin dato (FDA 0, FP 1).
      const filaFda = fda.find((f) => f.barra === barra);
      const filaFp = fdp.find((f) => f.barra === barra);
      const base = [fini, ffin, `MC-${selectedSource}`, lbl];
      ws.addRow([
        ...base,
        "FDA",
        "Factor de Distribución",
        "",
        barra,
        ...PERIODOS.map((p) => r5(filaFda?.periodos?.[p] ?? 0)),
      ]);
      ws.addRow([
        ...base,
        "FP",
        "Factor de Potencia",
        "",
        barra,
        ...PERIODOS.map((p) => r5(filaFp?.periodos?.[p] ?? 1)),
      ]);
    }
  }

  ws.getColumn(1).numFmt = "mm-dd-yy";
  ws.getColumn(2).numFmt = "mm-dd-yy";
  [12, 12, 14, 10, 11, 22, 12, 14].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  for (let c = 9; c <= 32; c++) ws.getColumn(c).width = 9;

  await wb.xlsx.writeFile(xlsxPath);
}
