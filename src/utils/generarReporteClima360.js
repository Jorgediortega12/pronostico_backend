// Convierte tablas {nombre, columnas, filas, nota?} en un archivo Excel o CSV.
// Una tabla = una hoja en Excel; en CSV las tablas van una tras otra, separadas
// por una fila en blanco y con su nombre como título.
import ExcelJS from "exceljs";

const nombreHoja = (n) => String(n).replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Datos";

export async function tablasAXlsx(tablas, meta = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Jano — Clima 360°";
  wb.created = new Date();
  const usados = new Set();
  for (const t of tablas) {
    let nombre = nombreHoja(t.nombre);
    for (let i = 2; usados.has(nombre); i++) nombre = `${nombreHoja(t.nombre).slice(0, 28)} ${i}`;
    usados.add(nombre);
    const ws = wb.addWorksheet(nombre);
    if (meta.titulo) {
      ws.addRow([meta.titulo]).font = { bold: true, size: 13 };
      if (meta.subtitulo) ws.addRow([meta.subtitulo]).font = { color: { argb: "FF666666" } };
      ws.addRow([]);
    }
    const cab = ws.addRow(t.columnas);
    cab.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cab.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009653" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });
    for (const f of t.filas) ws.addRow(f);
    t.columnas.forEach((c, i) => {
      ws.getColumn(i + 1).width = Math.max(12, String(c).length + 3);
    });
    if (t.nota) {
      ws.addRow([]);
      ws.addRow([t.nota]).font = { italic: true, color: { argb: "FF666666" } };
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const celdaCsv = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function tablasACsv(tablas) {
  const partes = tablas.map((t) =>
    [[t.nombre], t.columnas, ...t.filas, ...(t.nota ? [[t.nota]] : [])].map((fila) => fila.map(celdaCsv).join(",")).join("\r\n"),
  );
  // BOM para que Excel abra bien los acentos
  return Buffer.from("﻿" + partes.join("\r\n\r\n"), "utf8");
}
