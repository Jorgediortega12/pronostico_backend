// Lector de archivos ADEM: la demanda de un día es DMRE + PRRE del agente (como el GMR original); DMNR (no regulada) solo si no hay DMRE.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseAdemFile } from "./adem.service.js";

const HORAS = Array.from({ length: 24 }, (_, i) => `HORA ${String(i + 1).padStart(2, "0")}`);
const CABECERA = ["CODIGO", "AGENTE", "CONTENIDO", ...HORAS].join(";");

/** Una fila ADEM: el valor de cada hora es `base + hora` (la hora 1 vale base + 1), con coma decimal como en los archivos reales. */
const fila = (codigo, agente, base, extra = {}) =>
  [codigo, agente, "x", ...HORAS.map((_, i) => String(base + i + 1).replace(".", ",") + (extra.decimal ? ",5" : ""))].join(";");
const totalDe = (base) => HORAS.reduce((s, _, i) => s + base + i + 1, 0);

const escribir = (nombre, lineas) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adem_test_"));
  const archivo = path.join(dir, nombre);
  fs.writeFileSync(archivo, lineas.join("\n"), "latin1");
  return archivo;
};

test("usa DMRE + PRRE del agente CMMC aunque el archivo traiga DMNR", () => {
  const f = escribir("adem0601.TxF", [CABECERA, fila("DMNR", "CMMC", 100), fila("DMRE", "CMMC", 1000), fila("PRRE", "CMMC", 10), fila("DMRE", "OTRO", 5000)]);
  const [r, ...resto] = parseAdemFile(f);
  assert.equal(resto.length, 0);
  assert.equal(r.hora_1, 1001 + 11);
  assert.equal(r.hora_24, 1024 + 34);
  assert.equal(r.total, totalDe(1000) + totalDe(10));
  assert.notEqual(r.total, totalDe(100), "no debe tomar la demanda no regulada");
});

test("el orden de las filas del archivo no cambia el resultado", () => {
  const f = escribir("adem0602.TxF", [CABECERA, fila("PRRE", "CMMC", 10), fila("DMNR", "CMMC", 100), fila("DMRE", "CMMC", 1000)]);
  assert.equal(parseAdemFile(f)[0].total, totalDe(1000) + totalDe(10));
});

test("si el agente no trae DMRE se usa DMNR", () => {
  const f = escribir("adem0603.TxF", [CABECERA, fila("DMNR", "CMMC", 100), fila("ET", "CMMC", 7)]);
  assert.equal(parseAdemFile(f)[0].total, totalDe(100));
});

test("un DMRE sin PRRE es un archivo incompleto: se avisa, no se cambia de magnitud en silencio", () => {
  const f = escribir("adem0604.TxF", [CABECERA, fila("DMRE", "CMMC", 1000), fila("DMNR", "CMMC", 100)]);
  assert.throws(() => parseAdemFile(f), /DMRE pero no PRRE/);
});

test("un agente sin demanda utilizable da error claro", () => {
  const f = escribir("adem0605.TxF", [CABECERA, fila("ET", "CMMC", 7)]);
  assert.throws(() => parseAdemFile(f), /agente CMMC no tiene DMRE\+PRRE ni DMNR/);
});

test("prefiere CMMC; si no está, CMC; si no, el primer agente con demanda", () => {
  const sinCmmc = escribir("adem0606.TxF", [CABECERA, fila("DMRE", "XXXX", 9000), fila("PRRE", "XXXX", 90), fila("DMRE", "CMC", 2000), fila("PRRE", "CMC", 20)]);
  assert.equal(parseAdemFile(sinCmmc)[0].total, totalDe(2000) + totalDe(20));
  const cualquiera = escribir("adem0607.TxF", [CABECERA, fila("DMRE", "XXXX", 9000), fila("PRRE", "XXXX", 90)]);
  assert.equal(parseAdemFile(cualquiera)[0].total, totalDe(9000) + totalDe(90));
});

test("archivo mensual unido: cada día con su DMRE + PRRE; un día solo con DMNR usa DMNR", () => {
  const cab = ["FECHA", CABECERA].join(";");
  const con = (fecha, linea) => `${fecha};${linea}`;
  const f = escribir("adem_TxF_06_2026_unidos.txt", [
    cab,
    con("01/06/2026", fila("DMNR", "CMMC", 100)), con("01/06/2026", fila("DMRE", "CMMC", 1000)), con("01/06/2026", fila("PRRE", "CMMC", 10)),
    con("02/06/2026", fila("DMNR", "CMMC", 200)),
    con("03/06/2026", fila("ET", "CMMC", 1)),
  ]);
  const r = parseAdemFile(f);
  assert.deepEqual(r.map((x) => x._fecha), ["2026-06-01", "2026-06-02"], "el día sin demanda se omite");
  assert.equal(r[0].total, totalDe(1000) + totalDe(10));
  assert.equal(r[1].total, totalDe(200));
});

// Ancla con un archivo real y el valor que tiene el GMR original (Oracle de Afinia) para ese día.
const REAL = "C:/Users/nicol/Downloads/2026/adem0601.TxF";
test("archivo real del 1 de junio de 2026 = lo que tiene el GMR original", { skip: !fs.existsSync(REAL) && "el archivo real no está en esta máquina" }, () => {
  const [r] = parseAdemFile(REAL);
  assert.equal(Math.round(r.total * 10) / 10, 28582925.7);
  assert.equal(Math.round(r.hora_1 * 10) / 10, 1291633.2);
});

test("con un agente configurado usa SOLO ese agente, aunque el archivo traiga CMMC", () => {
  const f = escribir("adem1101.Tx2", [CABECERA, fila("DMRE", "CMMC", 1000), fila("PRRE", "CMMC", 10), fila("DMRE", "ATEC", 300), fila("PRRE", "ATEC", 3)]);
  assert.equal(parseAdemFile(f, "ATEC")[0].total, totalDe(300) + totalDe(3));
  assert.equal(parseAdemFile(f, "atec")[0].total, totalDe(300) + totalDe(3), "no distingue mayúsculas");
  assert.equal(parseAdemFile(f)[0].total, totalDe(1000) + totalDe(10), "sin configurar sigue siendo CMMC");
});

test("si el agente configurado no está en el archivo, avisa y no cambia de agente", () => {
  const f = escribir("adem1102.Tx2", [CABECERA, fila("DMRE", "CMMC", 1000), fila("PRRE", "CMMC", 10)]);
  assert.throws(() => parseAdemFile(f, "ATEC"), /agente ATEC \(configurado\) no tiene demanda en el archivo — agentes con demanda: CMMC/);
});

test("el agente configurado usa DMNR solo si no trae DMRE", () => {
  const f = escribir("adem1103.Tx2", [CABECERA, fila("DMNR", "ATEC", 50)]);
  assert.equal(parseAdemFile(f, "ATEC")[0].total, totalDe(50));
});
