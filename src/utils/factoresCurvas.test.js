import test from "node:test";
import assert from "node:assert/strict";
import {
  FLUJO_ACTIVA,
  FLUJO_REACTIVA,
  codigoDestino,
  codigoOrigen,
  convertirAPQ,
  esCodigoCurva,
  fpDePQ,
  leerCodigoCurva,
  leerNumero,
  reactivaDeActivaYFp,
  redondear,
  resolverFp,
  restarPeriodos,
  sumarPeriodos,
  tipoDeDia,
  validarPeriodos,
} from "./factoresCurvas.js";

const v24 = (f) => Array.from({ length: 24 }, (_, i) => f(i));

test("códigos reservados: se reconocen y no se confunden con códigos reales", () => {
  assert.equal(codigoDestino(12), "CT-12-D");
  assert.equal(codigoOrigen(12), "CT-12-O");
  assert.equal(esCodigoCurva("CT-12-D"), true);
  assert.equal(esCodigoCurva("CT-12-O"), true);
  for (const real of ["Guayaba110kVswTrafo2", "CT-12", "CT-x-D", "ct-12-D", "XCT-1-D", "CT-1-D2", "", null, undefined]) assert.equal(esCodigoCurva(real), false, String(real));
  assert.deepEqual(leerCodigoCurva("CT-7-O"), { componenteId: 7, lado: "O" });
  assert.equal(leerCodigoCurva("RPM1"), null);
  assert.deepEqual([FLUJO_ACTIVA, FLUJO_REACTIVA], ["AE", "R1"]);
});

test("leerNumero acepta número, texto con punto o coma, y rechaza lo demás", () => {
  assert.equal(leerNumero(7.363), 7.363);
  assert.equal(leerNumero("7.363"), 7.363);
  assert.equal(leerNumero("7,363"), 7.363);
  assert.equal(leerNumero("  12.5 "), 12.5);
  for (const malo of ["", "  ", "abc", null, undefined, {}, []]) assert.ok(Number.isNaN(leerNumero(malo)), String(malo));
});

test("validarPeriodos: 24 números no negativos; explica el primer problema", () => {
  const ok = validarPeriodos(v24((i) => `${i + 1},5`));
  assert.equal(ok.valores.length, 24);
  assert.equal(ok.valores[0], 1.5);
  assert.match(validarPeriodos(v24(() => 1).slice(0, 23)).error, /exactamente 24/);
  assert.match(validarPeriodos("hola").error, /exactamente 24/);
  assert.match(validarPeriodos(v24((i) => (i === 4 ? "x" : 1))).error, /periodo 5 no es un número/);
  assert.match(validarPeriodos(v24((i) => (i === 9 ? -0.1 : 1))).error, /periodo 10 es negativo/);
  assert.match(validarPeriodos(v24((i) => (i === 0 ? 2_000_000 : 1))).error, /demasiado grande/);
  assert.match(validarPeriodos(null, "La curva de GUAYABA1").error, /^La curva de GUAYABA1/);
});

test("convertirAPQ: la potencia aparente se reparte en activa y reactiva según el FP", () => {
  const s = v24(() => 10);
  const fp = v24(() => 0.8);
  const { p, q } = convertirAPQ(s, fp);
  assert.equal(p[0], 8);
  assert.equal(q[0], 6); // 10 * raíz(1 - 0.64)
  const { p: p1, q: q1 } = convertirAPQ(s, v24(() => 1));
  assert.equal(p1[3], 10);
  assert.equal(q1[3], 0);
  // la conversión se puede invertir: el FP que sale de P y Q es el original
  assert.deepEqual(fpDePQ(p, q), fp);
  // P² + Q² = S²
  for (let i = 0; i < 24; i++) assert.ok(Math.abs(Math.hypot(p[i], q[i]) - s[i]) < 1e-4);
});

test("reactivaDeActivaYFp: dada la activa y el FP, la reactiva cierra el triángulo de potencias", () => {
  const p = v24(() => 8);
  const q = reactivaDeActivaYFp(p, v24(() => 0.8));
  assert.equal(q[0], 6); // 8 * 0.6 / 0.8
  assert.deepEqual(reactivaDeActivaYFp(p, v24(() => 1)), v24(() => 0));
  assert.deepEqual(fpDePQ(p, q), v24(() => 0.8));
});

test("fpDePQ: sin potencia el FP es 1", () => {
  assert.deepEqual(fpDePQ([0, 3], [0, 4]), [1, 0.6]);
});

test("resolverFp: fijo, por periodo y de historia; valida los rangos", () => {
  assert.deepEqual(resolverFp({ modo: "FIJO", valor: "0,95" }).fp, v24(() => 0.95));
  assert.match(resolverFp({ modo: "FIJO", valor: 0 }).error, /mayor que 0 y hasta 1/);
  assert.match(resolverFp({ modo: "FIJO", valor: 1.2 }).error, /mayor que 0 y hasta 1/);
  assert.match(resolverFp({ modo: "FIJO" }).error, /mayor que 0/);
  const porPeriodo = v24((i) => 0.9 + i / 1000);
  assert.deepEqual(resolverFp({ modo: "PERIODO", periodos: porPeriodo }).fp, porPeriodo);
  assert.match(resolverFp({ modo: "PERIODO", periodos: [0.9] }).error, /24 valores/);
  assert.match(resolverFp({ modo: "PERIODO", periodos: v24((i) => (i === 2 ? 1.5 : 0.9)) }).error, /periodo 3/);
  assert.deepEqual(resolverFp({ modo: "BARRA", historia: v24(() => 0.97) }).fp, v24(() => 0.97));
  assert.match(resolverFp({ modo: "BARRA" }).error, /24 valores/);
  assert.match(resolverFp({ modo: "OTRO" }).error, /modo «OTRO»/);
});

test("tipoDeDia: ordinario, sábado, domingo y festivos (un sábado festivo es FESTIVO)", () => {
  const festivos = new Set(["2026-11-16", "2026-12-08", "2026-12-12"]); // lunes, martes y sábado festivos
  assert.equal(tipoDeDia("2026-11-24", festivos), "ORDINARIO"); // martes
  assert.equal(tipoDeDia("2026-11-21", festivos), "SABADO");
  assert.equal(tipoDeDia("2026-11-22", festivos), "FESTIVO"); // domingo
  assert.equal(tipoDeDia("2026-11-16", festivos), "FESTIVO"); // lunes festivo
  assert.equal(tipoDeDia("2026-12-12", festivos), "FESTIVO"); // sábado festivo
  assert.equal(tipoDeDia(new Date("2026-11-23T12:00:00Z"), festivos), "ORDINARIO");
  assert.equal(tipoDeDia("2026-11-23"), "ORDINARIO"); // sin festivos
});

test("sumarPeriodos y restarPeriodos: el destino es la suma de las porciones y a cada origen se le resta la suya", () => {
  const a = v24((i) => i + 1);
  const b = v24(() => 0.5);
  const suma = sumarPeriodos([a, b]);
  assert.equal(suma[0], 1.5);
  assert.equal(suma[23], 24.5);
  assert.deepEqual(restarPeriodos(suma, b), a);
  // el neto del sistema no cambia: lo que suma el destino es lo que restan los orígenes
  const origen1 = v24((i) => 10 + i);
  const origen2 = v24((i) => 20 + i);
  const porcion1 = v24(() => 1.25);
  const porcion2 = v24(() => 0.75);
  const antes = sumarPeriodos([origen1, origen2]);
  const despues = sumarPeriodos([restarPeriodos(origen1, porcion1), restarPeriodos(origen2, porcion2), sumarPeriodos([porcion1, porcion2])]);
  assert.deepEqual(despues, antes);
});

test("redondear a 5 decimales sin arrastrar errores de punto flotante", () => {
  assert.equal(redondear(0.1 + 0.2), 0.3);
  assert.equal(redondear(7.363 * 0.95), 6.99485);
});
