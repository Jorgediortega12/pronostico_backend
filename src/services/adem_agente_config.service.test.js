import test from "node:test";
import assert from "node:assert/strict";
import { normalizarAgente } from "./adem_agente_config.service.js";

test("normaliza el código del agente", () => {
  assert.equal(normalizarAgente("atec"), "ATEC");
  assert.equal(normalizarAgente("  CMMC "), "CMMC");
  assert.equal(normalizarAgente(""), null, "vacío = automático");
  assert.equal(normalizarAgente("   "), null);
  assert.equal(normalizarAgente(null), null);
});

test("rechaza códigos que no son un agente", () => {
  for (const malo of ["A", "AT EC", "ATEC;DROP", "ÁTEC", "x".repeat(21)]) assert.equal(normalizarAgente(malo), undefined, malo);
});
