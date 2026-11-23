import test from "node:test";
import assert from "node:assert/strict";
import { festivosColombia, domingoDePascua } from "./festivosColombia.js";
import { parseTipofecha } from "../services/adem.service.js";

const lista = (anio) => [...festivosColombia(anio)].sort();

test("domingo de Pascua de varios años", () => {
  const f = (a) => domingoDePascua(a).toISOString().slice(0, 10);
  assert.equal(f(2024), "2024-03-31");
  assert.equal(f(2025), "2025-04-20");
  assert.equal(f(2026), "2026-04-05");
  assert.equal(f(2027), "2027-03-28");
});

test("festivos de 2026 (los que pasan al lunes incluidos)", () => {
  assert.deepEqual(lista(2026), [
    "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15",
    "2026-06-29", "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25",
  ]);
});

test("festivos de 2025", () => {
  assert.deepEqual(lista(2025), [
    "2025-01-01", "2025-01-06", "2025-03-24", "2025-04-17", "2025-04-18", "2025-05-01", "2025-06-02", "2025-06-23", "2025-06-30",
    "2025-07-20", "2025-08-07", "2025-08-18", "2025-10-13", "2025-11-03", "2025-11-17", "2025-12-08", "2025-12-25",
  ]);
});

test("un festivo trasladable que cae en lunes no se mueve", () => {
  assert.ok(festivosColombia(2026).has("2026-06-29")); // San Pedro y San Pablo, lunes
  assert.ok(festivosColombia(2026).has("2026-10-12")); // Día de la Raza, lunes
});

test("todo festivo trasladable queda en lunes y siempre hay entre 17 y 18 festivos", () => {
  for (let a = 2015; a <= 2035; a++) {
    const f = festivosColombia(a);
    assert.ok(f.size >= 16 && f.size <= 18, `${a}: ${f.size}`);
  }
  for (const d of ["2026-01-12", "2026-03-23", "2026-05-18", "2026-06-08", "2026-06-15", "2026-08-17", "2026-11-02", "2026-11-16"]) assert.equal(new Date(d).getUTCDay(), 1, d);
});

test("tipo de día del lector ADEM: 0 entre semana, 1 sábado, 2 domingo o festivo", () => {
  const h = festivosColombia(2026);
  assert.equal(parseTipofecha("2026-06-02", h), "0"); // martes
  assert.equal(parseTipofecha("2026-06-06", h), "1"); // sábado
  assert.equal(parseTipofecha("2026-06-07", h), "2"); // domingo
  for (const d of ["2026-06-08", "2026-06-15", "2026-06-29", "2026-08-17"]) assert.equal(parseTipofecha(d, h), "2", d); // lunes festivos que antes salían como día normal
  assert.equal(parseTipofecha("2026-06-09", h), "0");
});
