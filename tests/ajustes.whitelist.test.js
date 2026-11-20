// BE2: ruta/campo/param fuera de la whitelist -> 422 local SIN llamar a EPM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { levantar, pedir, UUID, epmFalso } from "./ajustes.helpers.js";

const run = { ucp: "Antioquia", semana_inicio: "2026-11-23" };

async function con(fn, opts) {
  const ctx = await levantar(opts);
  try {
    await fn(ctx);
  } finally {
    await ctx.cerrar();
  }
}

const rechaza = (ruta, metodo, body, etiqueta) =>
  test(`422 local: ${etiqueta}`, () =>
    con(async ({ url, llamadas }) => {
      const r = await pedir(url, metodo, ruta, body);
      assert.equal(r.status, 422, JSON.stringify(r.json));
      assert.equal(r.json.success, false);
      assert.ok(r.json.message.length > 0);
      assert.equal(llamadas.length, 0, "no debe llamar a EPM");
    }));

rechaza("/preview", "POST", { ...run, campo_raro: 1 }, "campo desconocido en RunRequest");
rechaza("/preview", "POST", { ...run, ucp: "../etc" }, "ucp con patrón inválido");
rechaza("/preview", "POST", { ...run, ucp: "Bogota" }, "ucp no habilitada");
rechaza("/preview", "POST", { ...run, semana_inicio: "2026-11-24" }, "semana_inicio no lunes");
rechaza("/preview", "POST", { ...run, semana_inicio: "2026-02-30" }, "fecha inexistente");
rechaza("/preview", "POST", { ...run, perfil: "otro" }, "perfil fuera de {jamer, jamer_modelo}");
rechaza("/preview", "POST", { ...run, params: { paso_nuevo: {} } }, "paso desconocido en params");
rechaza("/preview", "POST", { ...run, params: { nivel: { alfa: 0.5 } } }, "clave desconocida en nivel");
rechaza("/preview", "POST", { ...run, params: { nivel: { alpha: 2 } } }, "alpha fuera de rango");
rechaza("/preview", "POST", { ...run, params: { nivel: { alpha: "0.5" } } }, "alpha string (sin coerción en body)");
rechaza("/preview", "POST", { ...run, params: { nivel: { g_ventana_dias: 10 } } }, "g_ventana_dias no múltiplo de 7");
rechaza("/preview", "POST", { ...run, params: { nivel: { modo: "x" } } }, "nivel.modo inválido");
rechaza("/preview", "POST", { ...run, params: { forma: { delta: "otro" } } }, "forma.delta inválido");
rechaza("/preview", "POST", { ...run, params: { control: { banda_salto_mw: -3 } } }, "banda_salto_mw negativa");
rechaza("/preview", "POST", { ...run, params: { base: { x: 1 } } }, "base no admite params");
rechaza("/preview", "POST", { ...run, base_curvas: { "2026-11-20": [1, 2, 3] } }, "base_curvas con 3 periodos");
rechaza("/preview", "POST", { ...run, base_curvas: { "no-fecha": new Array(24).fill(1) } }, "base_curvas con clave no fecha");
rechaza("/run", "POST", { semana_inicio: "2026-11-23" }, "falta ucp");
rechaza(`/corridas/no-uuid`, "GET", undefined, "id no UUID");
rechaza(`/corridas/${UUID}/versiones/0`, "GET", undefined, "version 0");
rechaza(`/corridas/${UUID}/versiones/abc`, "GET", undefined, "version no numérica");
rechaza(`/corridas/${UUID}/pasos/hackeo`, "PATCH", { estado: "aplicado", version_esperada: 1 }, "paso fuera de lista");
rechaza(`/corridas/${UUID}/pasos/nivel`, "PATCH", { estado: "aplicado", version_esperada: 1, params: { beta: 1 } }, "param de otro paso en PATCH");
rechaza(`/corridas/${UUID}/pasos/nivel`, "PATCH", { estado: "borrado", version_esperada: 1 }, "estado inválido");
rechaza(`/corridas/${UUID}/pasos/nivel`, "PATCH", { estado: "aplicado", version_esperada: 1, extra: 1 }, "campo extra en PATCH");
rechaza(`/corridas/${UUID}/aprobar`, "POST", { version_esperada: 1, admin: true }, "campo extra en aprobar");
rechaza(`/corridas/${UUID}/aprobar`, "POST", { motivo: "x" }, "aprobar sin version_esperada");
rechaza("/analogos", "POST", { ucp: "Antioquia", fecha: "2026-11-24", filtros: { raro: 1 } }, "filtro de análogos desconocido");
rechaza("/pronostico-emitido?ucp=Antioquia&semana_inicio=2026-11-24", "GET", undefined, "emitido con semana no lunes");
rechaza("/pronostico-emitido?ucp=Antioquia&semana_inicio=2026-11-23&x=1", "GET", undefined, "query con clave extra");
rechaza("/reales?ucp=Antioquia&desde=2026-01-01&hasta=2026-12-31", "GET", undefined, "reales con rango > 120 días");
rechaza("/reales?ucp=Antioquia&desde=2026-11-10&hasta=2026-11-01", "GET", undefined, "reales con hasta < desde");
rechaza("/acumulado-anual?ucp=Antioquia&anio=2026&hasta=2026-13-01", "GET", undefined, "acumulado con hasta inválida");
rechaza("/acumulado-anual?ucp=Antioquia&banda_pct=5", "GET", undefined, "acumulado sin anio (EPM lo exige)");
rechaza("/acumulado-anual?ucp=Antioquia&anio=2026&semana=1", "GET", undefined, "acumulado con query desconocida");
rechaza("/preview", "POST", { ...run, params: { control: { crecimiento_ventana_dias: 3 } } }, "crecimiento_ventana_dias < 7");
rechaza("/preview", "POST", { ...run, params: { forma: { saltar_puente: "si" } } }, "forma.saltar_puente no booleano");
rechaza("/acumulado-anual?ucp=Antioquia&anio=2026&banda_pct=0", "GET", undefined, "acumulado con banda 0");
rechaza("/aprobada?ucp=Bogota&semana_inicio=2026-11-23", "GET", undefined, "aprobada con ucp no habilitada");

test("ruta fuera de la tabla fija: 404, nada llega a EPM", () =>
  con(async ({ url, llamadas }) => {
    const r = await fetch(`${url}/proxy/adjustments/retrain`, { method: "POST" });
    assert.equal(r.status, 404);
    const r2 = await fetch(`${url}/${UUID}`, { method: "DELETE" });
    assert.equal(r2.status, 404);
    assert.equal(llamadas.length, 0);
  }));

test("params válidos del perfil Jamer pasan la whitelist y llegan a EPM", () =>
  con(async ({ url, llamadas }) => {
    const body = {
      ...run,
      perfil: "jamer_modelo",
      params: {
        nivel: { modo: "reciente", peso_modelo: 0.3, g_fuente: "fijo", g_fijo: 0.005, g_ventana_dias: 28, g_k: 1.2, g_min: -0.01, g_max: 0.02, g_min_pares: 14, saltar_puente: false },
        forma: { fuente: "reciente_clase", n: 2, delta: "plano", tramos: "modelo_anual", umbral_tramo_mw: 20, min_periodos_tramo: 3, suavizado_borde: 2 },
        especiales: { aplicar: false },
        control: { banda_salto_mw: 40, periodos_valle: [3, 4, 5], banda_crecimiento_pp: 3, cupo_dias_anuales: null, banda_error_pct: 5 },
      },
    };
    const r = await pedir(url, "POST", "/preview", body);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual(llamadas[0].body.params, body.params);
    assert.equal(llamadas[0].body.perfil, "jamer_modelo");
  }));

test("params reales de EPM (E5) completos pasan la whitelist: forma.saltar_puente y control.crecimiento_*", () =>
  con(async ({ url, llamadas }) => {
    const body = {
      ...run,
      perfil: "jamer",
      params: {
        forma: { saltar_puente: true, umbral_tramo_mw: 8000 },
        control: { crecimiento_ventana_dias: 28, crecimiento_min_pares: 14, banda_error_pct: 5, cupo_dias_anuales: 0 },
      },
    };
    const r = await pedir(url, "POST", "/preview", body);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual(llamadas[0].body.params, body.params);
  }));

test("acumulado-anual con hasta y cupo 0 pasa y llega a la ruta fija de EPM", () =>
  con(async ({ url, llamadas }) => {
    const r = await pedir(url, "GET", "/acumulado-anual?ucp=Antioquia&anio=2026&banda_pct=5&cupo=0&hasta=2026-11-20");
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(llamadas.length, 1);
    const u = new URL(llamadas[0].url);
    assert.equal(u.pathname, "/adjustments/acumulado-anual");
    assert.equal(u.searchParams.get("hasta"), "2026-11-20");
    assert.equal(u.searchParams.get("cupo"), "0");
  }));

test("sin ningún EPM falso accesible: no se hace llamada para entradas inválidas (control)", async () => {
  const epm = epmFalso();
  const ctx = await levantar({ epm });
  try {
    await pedir(ctx.url, "POST", "/run", { ucp: 5 });
    assert.equal(epm.llamadas.length, 0);
  } finally {
    await ctx.cerrar();
  }
});
