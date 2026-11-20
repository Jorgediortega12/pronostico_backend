// BE3 (usuario de sesión), BE4 (status/envoltorio de error), token de servicio, timeouts y tabla fija.
import { test } from "node:test";
import assert from "node:assert/strict";
import { levantar, pedir, UUID, epmFalso, modeloFalso } from "./ajustes.helpers.js";
import { mensajeDeDetail } from "../src/services/ajustes.service.js";

const run = { ucp: "Antioquia", semana_inicio: "2026-11-23", aplicar_automatico: true, usuario: "suplantado" };

async function con(fn, opts) {
  const ctx = await levantar(opts);
  try {
    await fn(ctx);
  } finally {
    await ctx.cerrar();
  }
}

test("run: 201, envoltorio {success,data}, usuario de la sesión sobrescribe el del cuerpo", () =>
  con(
    async ({ url, llamadas }) => {
      const r = await pedir(url, "POST", "/run", run);
      assert.equal(r.status, 201);
      assert.deepEqual(r.json, { success: true, data: { id: UUID } });
      assert.equal(llamadas.length, 1);
      assert.equal(llamadas[0].url, "http://epm.test:8001/adjustments/run");
      assert.equal(llamadas[0].init.method, "POST");
      assert.equal(llamadas[0].body.usuario, "Analista Prueba");
      assert.equal("aplicar_automatico" in llamadas[0].body, false, "aplicar_automatico se descarta");
      assert.equal(llamadas[0].init.headers["X-Ajustes-Token"], "tok-servicio");
    },
    { epm: epmFalso(() => ({ status: 201, json: { id: UUID } })) },
  ));

test("preview: no persiste usuario; descarta el del cuerpo; 200", () =>
  con(async ({ url, llamadas }) => {
    const r = await pedir(url, "POST", "/preview", run);
    assert.equal(r.status, 200);
    assert.equal("usuario" in llamadas[0].body, false);
  }));

test("usuario cae a usuario-<id> si no se puede leer el nombre", () =>
  con(
    async ({ url, llamadas }) => {
      await pedir(url, "POST", "/run", run);
      assert.equal(llamadas[0].body.usuario, "usuario-7");
    },
    { model: modeloFalso({ nombreUsuario: async () => { throw new Error("bd caída"); } }) },
  ));

test("sesión sin userId: 401 y no se llama a EPM", () =>
  con(
    async ({ url, llamadas }) => {
      const r = await pedir(url, "POST", "/run", run);
      assert.equal(r.status, 401);
      assert.equal(llamadas.length, 0);
    },
    { user: { session: {} } },
  ));

test("PATCH: usuario de sesión, URL EPM /steps/{paso} y cuerpo permitido", () =>
  con(async ({ url, llamadas }) => {
    const r = await pedir(url, "PATCH", `/corridas/${UUID}/pasos/forma`, {
      estado: "editado",
      version_esperada: 3,
      curvas: { "2026-11-23": Array.from({ length: 24 }, () => 1000) },
      params: { delta: "plano", tramos: "off" },
      motivo: "retoque",
      usuario: "otro",
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(llamadas[0].url, `http://epm.test:8001/adjustments/${UUID}/steps/forma`);
    assert.equal(llamadas[0].init.method, "PATCH");
    assert.equal(llamadas[0].body.usuario, "Analista Prueba");
    assert.equal(llamadas[0].body.version_esperada, 3);
  }));

test("aprobar: usuario de sesión y URL /approve", () =>
  con(async ({ url, llamadas }) => {
    const r = await pedir(url, "POST", `/corridas/${UUID}/aprobar`, {
      version_esperada: 2,
      motivo: "ok",
      excepciones_justificadas: ["TENDENCIA_FUERA_BANDA"],
      usuario: "otro",
    });
    assert.equal(r.status, 200);
    assert.equal(llamadas[0].url, `http://epm.test:8001/adjustments/${UUID}/approve`);
    assert.equal(llamadas[0].body.usuario, "Analista Prueba");
  }));

test("GET corridas/versiones/versión y acumulado-anual mapean a la ruta EPM fija", () =>
  con(async ({ url, llamadas }) => {
    await pedir(url, "GET", `/corridas/${UUID}`);
    await pedir(url, "GET", `/corridas/${UUID}/versiones`);
    await pedir(url, "GET", `/corridas/${UUID}/versiones/4`);
    await pedir(url, "GET", "/acumulado-anual?ucp=Antioquia&anio=2026&banda_pct=5&cupo=25");
    await pedir(url, "GET", "/aprobada?ucp=antioquia&semana_inicio=2026-11-23");
    assert.deepEqual(
      llamadas.map((l) => l.url.replace("http://epm.test:8001", "")),
      [
        `/adjustments/${UUID}`,
        `/adjustments/${UUID}/versiones`,
        `/adjustments/${UUID}/versiones/4`,
        "/adjustments/acumulado-anual?ucp=Antioquia&anio=2026&banda_pct=5&cupo=25",
        "/adjustments/aprobada?ucp=Antioquia&semana_inicio=2026-11-23",
      ],
    );
    assert.ok(llamadas.every((l) => l.init.method === "GET" && l.init.body === undefined));
  }));

test("analogos reenvía solo ucp/fecha/fecha_corte/filtros", () =>
  con(async ({ url, llamadas }) => {
    const r = await pedir(url, "POST", "/analogos", { ucp: "Antioquia", fecha: "2026-11-24", filtros: { limite: 5, meses: [11] } });
    assert.equal(r.status, 200);
    assert.deepEqual(llamadas[0].body, { ucp: "Antioquia", fecha: "2026-11-24", filtros: { limite: 5, meses: [11] } });
  }));

// --- BE4: mismo status y envoltorio de error ---------------------------------------------------
for (const [status, detail, esperado] of [
  [401, "Falta o no coincide la cabecera X-Ajustes-Token", "Falta o no coincide la cabecera X-Ajustes-Token"],
  [404, "UCP desconocida: 'Antioquia'", "UCP desconocida: 'Antioquia'"],
  [409, { mensaje: "La versión cambió", version_esperada: 1, version_actual: 2 }, "La versión cambió"],
  [422, { mensaje: "Hay bloqueos", bloqueos: [{ codigo: "X" }] }, "Hay bloqueos"],
  [422, [{ msg: "field required", loc: ["body", "x"] }], "field required"],
  [503, "Persistencia de ajustes no configurada (falta AJUSTES_DATABASE_URL)", "Persistencia de ajustes no configurada (falta AJUSTES_DATABASE_URL)"],
]) {
  test(`error EPM ${status} se propaga con el mismo status y {success:false,message,detail}`, () =>
    con(
      async ({ url }) => {
        const r = await pedir(url, "GET", `/corridas/${UUID}`);
        assert.equal(r.status, status);
        assert.equal(r.json.success, false);
        assert.equal(r.json.message, esperado);
        assert.deepEqual(r.json.detail, detail);
      },
      { epm: epmFalso(() => ({ status, json: { detail } })) },
    ));
}

test("EPM caído (fetch lanza): 502 'La API de ajustes no respondió'", () =>
  con(
    async ({ url }) => {
      const r = await pedir(url, "GET", `/corridas/${UUID}`);
      assert.equal(r.status, 502);
      assert.equal(r.json.message, "La API de ajustes no respondió");
      assert.equal(r.json.success, false);
    },
    { epm: epmFalso(() => new Error("ECONNREFUSED")) },
  ));

test("respuesta no JSON de EPM con 5xx: mensaje genérico, sin reenviar el texto crudo", () =>
  con(
    async ({ url }) => {
      const r = await pedir(url, "GET", `/corridas/${UUID}`);
      assert.equal(r.status, 500);
      assert.equal(r.json.success, false);
      assert.equal(r.json.message, "Error en la API de ajustes");
      assert.equal(JSON.stringify(r.json).includes("Traceback"), false);
    },
    { epm: epmFalso(() => ({ status: 500, texto: "Traceback (most recent call last): /srv/epm/x.py" })) },
  ));

test("5xx de EPM con detail estructurado: solo llega `mensaje`, sin `causa` interna", () =>
  con(
    async ({ url }) => {
      const r = await pedir(url, "GET", `/corridas/${UUID}`);
      assert.equal(r.status, 502);
      assert.equal(r.json.message, "No se pudo obtener el pronóstico base del modelo");
      assert.equal(r.json.detail, "No se pudo obtener el pronóstico base del modelo");
      assert.equal(JSON.stringify(r.json).includes("secreto"), false);
    },
    {
      epm: epmFalso(() => ({
        status: 502,
        json: { detail: { mensaje: "No se pudo obtener el pronóstico base del modelo", causa: "secreto /srv/x.py" } },
      })),
    },
  ));

// --- B1: modo estricto (falla cerrado) ------------------------------------------------------------
for (const [nombre, env, quien] of [
  ["producción sin token", { NODE_ENV: "production", AJUSTES_SERVICE_TOKEN: "" }, "AJUSTES_SERVICE_TOKEN"],
  ["producción sin URL de EPM", { NODE_ENV: "production", EPM_AJUSTES_URL: "" }, "EPM_AJUSTES_URL"],
  ["AJUSTES_ESTRICTO=1 sin token", { AJUSTES_ESTRICTO: "1", AJUSTES_SERVICE_TOKEN: "" }, "AJUSTES_SERVICE_TOKEN"],
]) {
  test(`modo estricto (${nombre}): 503 y NO se llama a EPM`, () =>
    con(
      async ({ url, llamadas }) => {
        const r = await pedir(url, "GET", `/corridas/${UUID}`);
        assert.equal(r.status, 503);
        assert.equal(r.json.success, false);
        assert.equal(r.json.message, "La API de ajustes no está configurada");
        assert.equal(llamadas.length, 0);
        assert.equal(JSON.stringify(r.json).includes(quien), false);
      },
      { env },
    ));
}

test("modo estricto con token y URL: reenvía normalmente con el token", () =>
  con(
    async ({ url, llamadas }) => {
      const r = await pedir(url, "GET", `/corridas/${UUID}`);
      assert.equal(r.status, 200);
      assert.equal(llamadas[0].init.headers["X-Ajustes-Token"], "tok-servicio");
    },
    { env: { NODE_ENV: "production" } },
  ));

test("AJUSTES_ESTRICTO=0 desactiva el modo estricto aun en producción; desarrollo conserva el comportamiento", async () => {
  const { modoEstricto } = await import("../src/services/ajustes.service.js");
  assert.equal(modoEstricto({ NODE_ENV: "production", AJUSTES_ESTRICTO: "0" }), false);
  assert.equal(modoEstricto({ NODE_ENV: "production" }), true);
  assert.equal(modoEstricto({ NODE_ENV: "development" }), false);
  assert.equal(modoEstricto({}), false);
  assert.equal(modoEstricto({ AJUSTES_ESTRICTO: "true" }), true);
});

test("sin AJUSTES_SERVICE_TOKEN no se manda la cabecera; el token nunca aparece en respuestas", () =>
  con(
    async ({ url, llamadas }) => {
      const r = await pedir(url, "GET", `/corridas/${UUID}`);
      assert.equal("X-Ajustes-Token" in llamadas[0].init.headers, false);
      assert.equal(JSON.stringify(r.json).includes("tok-servicio"), false);
    },
    { env: { AJUSTES_SERVICE_TOKEN: "" } },
  ));

test("el token de servicio no llega al navegador (respuesta de error y éxito)", () =>
  con(async ({ url }) => {
    const r = await pedir(url, "GET", `/corridas/${UUID}`);
    assert.equal(JSON.stringify(r.json).includes("tok-servicio"), false);
  }));

test("timeouts: PATCH base+aplicado usa 180 s; el resto 30 s", async () => {
  const orig = globalThis.setTimeout;
  const plazos = [];
  globalThis.setTimeout = (fn, ms, ...a) => {
    plazos.push(ms);
    return orig(fn, ms, ...a);
  };
  try {
    await con(async ({ url }) => {
      await pedir(url, "POST", "/preview", { ucp: "Antioquia", semana_inicio: "2026-11-23" });
      await pedir(url, "PATCH", `/corridas/${UUID}/pasos/base`, { estado: "aplicado", version_esperada: 1 });
      await pedir(url, "PATCH", `/corridas/${UUID}/pasos/nivel`, { estado: "aplicado", version_esperada: 1 });
      await pedir(url, "GET", `/corridas/${UUID}`);
    });
  } finally {
    globalThis.setTimeout = orig;
  }
  const relevantes = plazos.filter((p) => p === 180_000 || p === 30_000);
  assert.deepEqual(relevantes, [180_000, 180_000, 30_000, 30_000]);
});

test("ucps: lista por defecto y override AJUSTES_UCPS (inválido cae al default)", async () => {
  await con(async ({ url }) => {
    const r = await pedir(url, "GET", "/ucps");
    assert.deepEqual(r.json.data.map((u) => u.ucp), ["Antioquia", "Atlantico"]);
  });
  await con(
    async ({ url }) => {
      const r = await pedir(url, "GET", "/ucps");
      assert.deepEqual(r.json.data, [{ ucp: "Caribe", nombre: "Caribe Sur" }]);
      const p = await pedir(url, "POST", "/preview", { ucp: "Caribe", semana_inicio: "2026-11-23" });
      assert.equal(p.status, 200);
    },
    { env: { AJUSTES_UCPS: '[{"ucp":"Caribe","nombre":"Caribe Sur"}]' } },
  );
  await con(
    async ({ url }) => {
      const r = await pedir(url, "GET", "/ucps");
      assert.equal(r.json.data.length, 2);
    },
    { env: { AJUSTES_UCPS: "no-json" } },
  );
});

test("mensajeDeDetail", () => {
  assert.equal(mensajeDeDetail("hola"), "hola");
  assert.equal(mensajeDeDetail({ mensaje: "m" }), "m");
  assert.equal(mensajeDeDetail([{ msg: "a" }, { msg: "b" }]), "a; b");
  assert.equal(mensajeDeDetail(null), "Error en la API de ajustes");
});
