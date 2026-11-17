// Formato 3 de importación de medidas: CSV horizontal de SCADA 2 / PI
// ("p_average-AAAAMMDD.csv"). Es el mismo formato y las mismas reglas que
// ParsearCSV_SCADA2 / GuardarMedidasSCADA2 de jano-caribemar
// (modulofactores.aspx.cs):
//
//   Cabecera: ,14/01/24 0:00,14/01/24 1:00, ... ,14/01/24 23:00        (D/M/AA H:mm)
//   Datos:    /ARJ304  /Astrea  /EPAG1110 /P  /MvMoment,v0,v1,...
//             /ARJ304  /Astrea  /EPAG1110 /Q  /MvMoment,v0,v1,...
//
//  - Periodos: la hora 0:00 del día X es el P24 del día X-1; la hora h (1..23)
//    del día X es el P(h) de X. El P24 de un día sale de la columna 0:00 del
//    día siguiente.
//  - Flujo: /P -> "AE", /Q -> "R1" (cualquier otra variable se descarta).
//  - codigo_rpm: la ruta completa SIN espacios, incluyendo /P o /Q y /MvMoment.
//    Ej.: "/Apartad /13.8kV  /EPAG1110  /P       /MvMoment" ->
//         "/Apartad/13.8kV/EPAG1110/P/MvMoment"
//  - Los valores se guardan tal cual vienen (sin dividir) y una celda que no
//    se puede leer cuenta como 0.
//  - Cada codigo_rpm + flujo + fecha es una fila. Si la misma combinación se
//    repite, los valores se suman.
//  - Un periodo queda en null si la carga nunca lo tocó (se distingue así de
//    un 0 real). Ver clasificarMedidasPI para qué se guarda y qué no.

const FLUJO_POR_VARIABLE = { P: "AE", Q: "R1" };

const aIso = (fecha) => fecha.toISOString().slice(0, 10);

/**
 * Parsea UN archivo y acumula en `acumulado` (Map compartido entre todos los
 * archivos de la misma carga).
 * clave `${codigo_rpm}|${flujo}|${fecha}` -> { codigo_rpm, flujo, fecha, p: Array(25) (índices 1..24, null si no se tocó) }
 * @returns {{ ok: boolean, mensaje?: string }}
 */
export const parsearCsvPI = (texto, acumulado) => {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/);
  if (lineas.length < 2) return { ok: false, mensaje: "El archivo CSV está vacío o no tiene datos." };

  // ── Cabecera: columna i -> { fecha, periodo }
  const headers = lineas[0].split(",");
  const colFecha = new Array(headers.length).fill(null);
  const colPeriodo = new Array(headers.length).fill(0);

  for (let i = 1; i < headers.length; i++) {
    const h = headers[i].trim().replace(/^"+|"+$/g, "");
    if (!h) continue;
    const espacio = h.indexOf(" ");
    if (espacio < 0) continue;
    const [dia, mes, anioRaw] = h.slice(0, espacio).split("/");
    if (!dia || !mes || !anioRaw) continue;
    const anio = anioRaw.trim().length === 2 ? `20${anioRaw.trim()}` : anioRaw.trim();
    const fechaHeader = `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
    const hora = parseInt(h.slice(espacio + 1).split(":")[0], 10) || 0;

    if (hora === 0) {
      const dt = new Date(`${fechaHeader}T00:00:00Z`);
      if (Number.isNaN(dt.getTime())) continue;
      dt.setUTCDate(dt.getUTCDate() - 1);
      colFecha[i] = aIso(dt);
      colPeriodo[i] = 24;
    } else {
      colFecha[i] = fechaHeader;
      colPeriodo[i] = hora;
    }
  }
  if (!colFecha.some(Boolean)) return { ok: false, mensaje: "No se pudo parsear ninguna fecha del encabezado." };

  // ── Filas
  const antes = acumulado.size;
  for (let f = 1; f < lineas.length; f++) {
    const linea = lineas[f];
    if (!linea || !linea.trim()) continue;
    const coma = linea.indexOf(",");
    if (coma < 0) continue;

    const ruta = linea.slice(0, coma).trim();
    const valores = linea.slice(coma + 1).split(",");

    const segmentos = ruta.split("/");
    let flujo = "";
    for (const seg of segmentos) {
      const s = seg.trim();
      if (FLUJO_POR_VARIABLE[s]) {
        flujo = FLUJO_POR_VARIABLE[s];
        break;
      }
    }
    if (!flujo) continue;
    if (segmentos.length < 4) continue;
    const codigo = ruta.replace(/ /g, "");
    if (!codigo) continue;

    for (let v = 0; v < valores.length; v++) {
      const col = v + 1;
      if (col >= headers.length) break;
      if (!colFecha[col] || colPeriodo[col] === 0) continue;

      const n = parseFloat(String(valores[v]).trim());
      const valor = Number.isNaN(n) ? 0 : n;

      const clave = `${codigo}|${flujo}|${colFecha[col]}`;
      let m = acumulado.get(clave);
      if (!m) {
        m = { codigo_rpm: codigo, flujo, fecha: colFecha[col], p: new Array(25).fill(null) };
        acumulado.set(clave, m);
      }
      m.p[colPeriodo[col]] = (m.p[colPeriodo[col]] ?? 0) + valor;
    }
  }

  if (acumulado.size === antes) return { ok: false, mensaje: "No se encontraron filas válidas de /P o /Q en el CSV." };
  return { ok: true };
};

/**
 * Separa lo acumulado en:
 *  - completas: traen P1-P23 Y P24 dentro de esta misma carga (día "de en
 *    medio": su archivo + el del día siguiente). Se insertan/actualizan.
 *  - borde: traen solo un lado (primer/último día de lo subido). NO crean
 *    fila nueva: solo actualizan si la fila ya existe en la BD.
 */
export const clasificarMedidasPI = (acumulado) => {
  const completas = [];
  const borde = [];
  for (const m of acumulado.values()) {
    let tieneP1aP23 = false;
    for (let per = 1; per <= 23 && !tieneP1aP23; per++) if (m.p[per] !== null) tieneP1aP23 = true;
    const tieneP24 = m.p[24] !== null;
    (tieneP1aP23 && tieneP24 ? completas : borde).push(m);
  }
  return { completas, borde };
};
