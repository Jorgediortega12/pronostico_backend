// Convierte tablas {nombre, columnas, filas, nota?} en un archivo Excel o CSV.
// Una tabla = una hoja en Excel; en CSV las tablas van una tras otra, separadas
// por una fila en blanco y con su nombre como título.
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

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

// ─── PDF ─────────────────────────────────────────────────────────────────────
// A4 horizontal, una sección por tabla con encabezado repetido en cada página.
// Usa la fuente Helvetica incorporada (cubre tildes y ñ).
export function tablasAPdf(tablas, meta = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true });
    const partes = [];
    doc.on("data", (c) => partes.push(c));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);

    const VERDE = "#009653";
    const ancho = doc.page.width - 72;
    const limiteY = () => doc.page.height - 50;
    const texto = (v) => (v == null ? "—" : String(v));

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#1F2A24").text(meta.titulo ?? "Reporte", 36, 36);
    if (meta.subtitulo) doc.font("Helvetica").fontSize(10).fillColor("#666666").text(meta.subtitulo);
    doc.font("Helvetica").fontSize(8).fillColor("#999999").text(`Generado el ${new Date().toLocaleString("es-CO")} — Jano · Clima 360°`);
    doc.moveDown(0.8);

    for (const t of tablas) {
      const n = t.columnas.length;
      const fuente = n > 12 ? 6.5 : n > 8 ? 7.5 : 9;
      const w = ancho / n;
      const alto = fuente + 8;

      const encabezadoTabla = () => {
        const y = doc.y;
        doc.rect(36, y, ancho, alto).fill(VERDE);
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(fuente);
        t.columnas.forEach((c, i) => doc.text(texto(c), 36 + i * w + 3, y + 4, { width: w - 6, height: alto, ellipsis: true, lineBreak: false }));
        doc.y = y + alto;
      };

      if (doc.y + alto * 3 > limiteY()) doc.addPage();
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#1F2A24").text(t.nombre, 36, doc.y);
      doc.moveDown(0.3);
      encabezadoTabla();

      t.filas.forEach((fila, k) => {
        if (doc.y + alto > limiteY()) {
          doc.addPage();
          doc.y = 36;
          encabezadoTabla();
        }
        const y = doc.y;
        if (k % 2 === 1) doc.rect(36, y, ancho, alto).fill("#F3F8F5");
        doc.fillColor("#1F2A24").font("Helvetica").fontSize(fuente);
        fila.forEach((v, i) => doc.text(texto(v), 36 + i * w + 3, y + 4, { width: w - 6, height: alto, ellipsis: true, lineBreak: false }));
        doc.y = y + alto;
      });

      if (t.nota) {
        doc.moveDown(0.4);
        doc.font("Helvetica-Oblique").fontSize(8).fillColor("#666666").text(t.nota, 36, doc.y, { width: ancho });
      }
      doc.moveDown(1.2);
    }

    const total = doc.bufferedPageRange().count;
    for (let i = 0; i < total; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // si no, escribir en el margen inferior crea páginas en blanco
      doc.font("Helvetica").fontSize(8).fillColor("#999999").text(`Página ${i + 1} de ${total}`, 36, doc.page.height - 28, { width: ancho, align: "right", lineBreak: false });
    }
    doc.end();
  });
}
