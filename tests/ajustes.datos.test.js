// pronostico-emitido y reales: armado desde filas de BD simuladas (sin base de datos real).
import { test } from "node:test";
import assert from "node:assert/strict";
import { levantar, pedir, modeloFalso, curva } from "./ajustes.helpers.js";
import { emisionesRetro, realesRetro, reales } from "../src/querys/ajustes.query.js";
import { lunesDe } from "../src/services/ajustes.service.js";

const fila = (fecha, tipo, base) => ({
  fecha,
  tipo,
  ...Object.fromEntries(curva(base).map((v, i) => [`p${i + 1}`, v])),
});

async function con(fn, opts) {
  const ctx = await levantar(opts);
  try {
    await fn(ctx);
  } finally {
    await ctx.cerrar();
  }
}

const Q = "/pronostico-emitido?ucp=Antioquia&semana_inicio=2030-03-18";
const sesion = { codigo: 9001, nombre: "SesionDemo", version: 1, observacion: "VF", fecha_sesion: "2030-03-13" };

test("pronostico-emitido: cubre corte+1..domingo, P gana a PM, sin llamar a EPM", () => {
  const dias = ["2030-03-10", "2030-03-11", "2030-03-12", "2030-03-13", "2030-03-14", "2030-03-15", "2030-03-16", "2030-03-17"];
  const filas = [
    ...dias.map((d, i) => fila(d, "PM", 100 + i)),
    ...["2030-03-18", "2030-03-19", "2030-03-20", "2030-03-21", "2030-03-22", "2030-03-23", "2030-03-24"].map((d, i) => fila(d, "P", 200 + i)),
    fila("2030-03-17", "P", 999), // P y PM el mismo día: P gana
  ];
  let consulta;
  return con(
    async ({ url, llamadas }) => {
      const r = await pedir(url, "GET", Q);
      assert.equal(r.status, 200, JSON.stringify(r.json));
      const d = r.json.data;
      assert.equal(d.base_ref, "sphere:sesion:9001");
      assert.equal(d.fecha_emision, "2030-03-13");
      assert.equal(d.modelo_version, "sphere:SesionDemo v1");
      assert.deepEqual(Object.keys(d.base_curvas), [...dias, "2030-03-18", "2030-03-19", "2030-03-20", "2030-03-21", "2030-03-22", "2030-03-23", "2030-03-24"]);
      assert.equal(d.base_curvas["2030-03-17"][0], 999);
      assert.equal(d.base_curvas["2030-03-10"].length, 24);
      assert.equal(d.sesion.codigo, 9001);
      assert.equal(llamadas.length, 0);
      assert.deepEqual(consulta, ["sesion-1", "2030-03-10", "2030-03-24"]);
    },
    {
      model: modeloFalso({
        sesionEmitida: async () => sesion,
        ultimoRealHasta: async () => "2030-03-09",
        periodosSesion: async (cod, desde, hasta) => {
          consulta = [`sesion-${cod === 9001 ? 1 : 0}`, desde, hasta];
          return filas;
        },
      }),
    },
  );
});

test("pronostico-emitido: 404 si no hay sesión; 404 con 'faltan' si faltan días; 422 si semana observada", async () => {
  await con(async ({ url }) => {
    const r = await pedir(url, "GET", Q);
    assert.equal(r.status, 404);
    assert.equal(r.json.success, false);
  });
  await con(
    async ({ url }) => {
      const r = await pedir(url, "GET", Q);
      assert.equal(r.status, 404);
      assert.ok(r.json.detail.faltan.includes("2030-03-24"));
    },
    {
      model: modeloFalso({
        sesionEmitida: async () => sesion,
        ultimoRealHasta: async () => "2030-03-16",
        periodosSesion: async () => [fila("2030-03-17", "PM", 1)],
      }),
    },
  );
  await con(
    async ({ url }) => {
      const r = await pedir(url, "GET", Q);
      assert.equal(r.status, 422);
    },
    { model: modeloFalso({ sesionEmitida: async () => sesion, ultimoRealHasta: async () => "2030-03-18" }) },
  );
});

test("pronostico-emitido (BA1): el corte es el día anterior a la emisión; la base arranca el día de la emisión", () => {
  let argFecha;
  const dias = ["2030-03-13", "2030-03-14", "2030-03-15", "2030-03-16", "2030-03-17", "2030-03-18", "2030-03-19", "2030-03-20", "2030-03-21", "2030-03-22", "2030-03-23", "2030-03-24"];
  return con(
    async ({ url }) => {
      const r = await pedir(url, "GET", Q);
      assert.equal(r.status, 200, JSON.stringify(r.json));
      assert.equal(argFecha, sesion.fecha_sesion, "la consulta recibe la emisión y excluye ese día (fecha < $2)");
      assert.equal(Object.keys(r.json.data.base_curvas)[0], sesion.fecha_sesion);
      assert.equal(r.json.data.fecha_emision, sesion.fecha_sesion);
    },
    {
      model: modeloFalso({
        sesionEmitida: async () => sesion,
        ultimoRealHasta: async (_u, fecha) => {
          argFecha = fecha;
          return "2030-03-12"; // real del día de la emisión (13) existe pero queda fuera del corte
        },
        periodosSesion: async () => dias.map((d) => fila(d, "P", 100)),
      }),
    },
  );
});

test("pronostico-emitido: periodos no finitos cuentan como día faltante", () =>
  con(
    async ({ url }) => {
      const r = await pedir(url, "GET", "/pronostico-emitido?ucp=Antioquia&semana_inicio=2030-03-11");
      assert.equal(r.status, 404);
      assert.deepEqual(r.json.detail.faltan, ["2030-03-10", "2030-03-11", "2030-03-12", "2030-03-13", "2030-03-14", "2030-03-15", "2030-03-16", "2030-03-17"]);
    },
    {
      model: modeloFalso({
        sesionEmitida: async () => sesion,
        ultimoRealHasta: async () => "2030-03-09",
        periodosSesion: async () => {
          const mala = fila("2030-03-10", "P", 5);
          mala.p3 = null;
          return [mala];
        },
      }),
    },
  ));

test("reales: {fecha:[24]} solo días existentes; {} si no hay; números como Number", async () => {
  await con(
    async ({ url }) => {
      const r = await pedir(url, "GET", "/reales?ucp=Antioquia&desde=2030-03-04&hasta=2030-03-09");
      assert.equal(r.status, 200);
      assert.deepEqual(Object.keys(r.json.data), ["2030-03-04"]);
      assert.equal(r.json.data["2030-03-04"][1], 1001.5);
      assert.equal(r.json.data["2030-03-04"][23], null, "NaN/None -> null");
    },
    {
      model: modeloFalso({
        reales: async () => [
          { ...fila("2030-03-04", "D", 1000), p2: "1001.5", p24: "abc" },
          { fecha: "2030-03-05", ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`p${i + 1}`, null])) },
        ],
      }),
    },
  );
  await con(async ({ url }) => {
    const r = await pedir(url, "GET", "/reales?ucp=Antioquia&desde=2030-03-04&hasta=2030-03-09");
    assert.deepEqual(r.json, { success: true, data: {} });
  });
});

test("error de BD: 500 genérico sin filtrar detalles internos", () =>
  con(
    async ({ url }) => {
      const r = await pedir(url, "GET", "/reales?ucp=Antioquia&desde=2030-03-04&hasta=2030-03-09");
      assert.equal(r.status, 500);
      assert.equal(r.json.success, false);
      assert.equal(JSON.stringify(r.json).includes("relation"), false);
    },
    { model: modeloFalso({ reales: async () => { throw new Error('relation "actualizaciondatos" does not exist'); } }) },
  ));

test("ultimoRealHasta (B2): solo cuenta días con los 24 periodos completos (alineado con el corte de EPM)", async () => {
  const { ultimoRealHasta } = await import("../src/querys/ajustes.query.js");
  for (let i = 1; i <= 24; i++) assert.match(ultimoRealHasta, new RegExp(`p${i} >= 0\\b`));
  assert.match(ultimoRealHasta, /fecha < \$2/, "corte estrictamente anterior a la emisión (EPM: fecha_emision - 1)");
  assert.doesNotMatch(ultimoRealHasta, /fecha <= \$2/);
});

// aprendizaje-error: armado de emisiones (regla ex-ante por fecha) y reales desde filas simuladas.
const hoyRetro = "2030-03-27"; // miércoles
const ultimoRetro = "2030-03-22"; // viernes (real con rezago); lunes = 2030-03-18
const filaRetro = (fecha, codigo, version, base) => ({ codigo, version, ...fila(fecha, "P", base) });
const filaReal = (fecha, codigo, base, extra = {}) => ({ codigo, ...fila(fecha, "x", base), ...extra });

test("aprendizaje-error: ventana anclada al último real, emisiones por fecha agrupadas por lunes y reales mínimos", () => {
  let cUltimo;
  let cEmision;
  let cReales;
  const nula = { ...filaRetro("2030-03-12", 9001, 1, 50), p5: null };
  return con(
    async ({ url, llamadas }) => {
      const r = await pedir(url, "GET", "/aprendizaje-error?ucp=antioquia&semanas=4");
      assert.equal(r.status, 200, JSON.stringify(r.json));
      assert.deepEqual(cUltimo, ["Antioquia", "2030-03-28"]); // hoy + 1 (la consulta es fecha < $2)
      assert.deepEqual(cEmision, ["Antioquia", "2030-02-18", ultimoRetro]); // lunes(último real) - 28 d, hasta el último real
      assert.deepEqual(cReales, ["Antioquia", "2030-02-18", ultimoRetro]);
      const b = llamadas[0].body;
      assert.equal(b.ucp, "Antioquia");
      assert.equal(b.semanas, 4);
      // una semana con días de dos sesiones (v1 sin sáb/dom; sáb/dom de la siguiente sesión) = una sola emisión
      assert.deepEqual(b.emisiones.map((e) => [e.semana_inicio, e.version]), [["2030-03-11", 1], ["2030-03-18", 2]]);
      assert.deepEqual(Object.keys(b.emisiones[0].curvas), ["2030-03-11"]); // 12/03 incompleto omitido
      assert.deepEqual(Object.keys(b.emisiones[1].curvas), ["2030-03-18"]);
      assert.equal(b.emisiones[0].curvas["2030-03-11"].length, 24);
      // reales: solo fechas con emisión; no se envía 13/03 ni 19/03
      assert.deepEqual(Object.keys(b.reales), ["2030-03-11", "2030-03-18"]);
    },
    {
      hoy: () => hoyRetro,
      model: modeloFalso({
        ultimoRealHasta: async (...a) => {
          cUltimo = a.slice(0, 2);
          return ultimoRetro;
        },
        emisionesRetro: async (...a) => {
          cEmision = a.slice(0, 3);
          return [filaRetro("2030-03-11", 9001, 1, 100), nula, filaRetro("2030-03-18", 9002, 2, 300)];
        },
        realesRetro: async (...a) => {
          cReales = a.slice(0, 3);
          return [filaReal("2030-03-11", 1, 500), filaReal("2030-03-13", 1, 520), filaReal("2030-03-18", 1, 530), filaReal("2030-03-19", 1, 540)];
        },
      }),
    },
  );
});

test("aprendizaje-error: sáb/dom de sesiones distintas caen en la misma semana (regla por fecha) y la versión es la mínima", () =>
  con(
    async ({ url, llamadas }) => {
      const r = await pedir(url, "GET", "/aprendizaje-error?ucp=Antioquia");
      assert.equal(r.status, 200, JSON.stringify(r.json));
      const [e] = llamadas[0].body.emisiones;
      assert.equal(e.semana_inicio, "2030-03-11");
      assert.equal(e.version, 1);
      assert.deepEqual(Object.keys(e.curvas), ["2030-03-11", "2030-03-16", "2030-03-17"]);
      assert.equal(e.curvas["2030-03-16"][0], 222); // sáb tomado de la sesión 9002
    },
    {
      hoy: () => hoyRetro,
      model: modeloFalso({
        ultimoRealHasta: async () => "2030-03-17",
        emisionesRetro: async () => [filaRetro("2030-03-11", 9001, 1, 100), filaRetro("2030-03-16", 9002, 3, 222), filaRetro("2030-03-17", 9002, 3, 223)],
        realesRetro: async () => [filaReal("2030-03-16", 1, 5)],
      }),
    },
  ));

test("aprendizaje-error: reales duplicados por fecha -> gana la última fila (por codigo); si la última está incompleta el día se descarta", () =>
  con(
    async ({ url, llamadas }) => {
      const r = await pedir(url, "GET", "/aprendizaje-error?ucp=Antioquia");
      assert.equal(r.status, 200);
      const reales = llamadas[0].body.reales;
      assert.equal(reales["2030-03-11"][0], 700); // codigo 2 gana a codigo 1
      assert.ok(!("2030-03-12" in reales)); // la última fila (codigo 2) está incompleta
    },
    {
      hoy: () => hoyRetro,
      model: modeloFalso({
        ultimoRealHasta: async () => "2030-03-12",
        emisionesRetro: async () => [filaRetro("2030-03-11", 9001, 1, 100), filaRetro("2030-03-12", 9001, 1, 100)],
        realesRetro: async () => [
          filaReal("2030-03-11", 1, 500),
          filaReal("2030-03-11", 2, 700),
          filaReal("2030-03-12", 1, 510),
          filaReal("2030-03-12", 2, 510, { p3: null }),
        ],
      }),
    },
  ));

test("aprendizaje-error: sin real o sin emisiones se envía vacío a EPM (sin reales sueltos); BD caída -> 500 genérico", async () => {
  const vacio = { ucp: "Antioquia", semanas: 12, emisiones: [], reales: {} };
  await con(
    async ({ url, llamadas }) => {
      assert.equal((await pedir(url, "GET", "/aprendizaje-error?ucp=Antioquia")).status, 200);
      assert.deepEqual(llamadas[0].body, vacio);
    },
    { hoy: () => hoyRetro },
  );
  await con(
    async ({ url, llamadas }) => {
      assert.equal((await pedir(url, "GET", "/aprendizaje-error?ucp=Antioquia")).status, 200);
      assert.deepEqual(llamadas[0].body, vacio); // hay reales pero ninguna emisión: no se mandan
    },
    {
      hoy: () => hoyRetro,
      model: modeloFalso({ ultimoRealHasta: async () => ultimoRetro, realesRetro: async () => [filaReal("2030-03-18", 1, 5)] }),
    },
  );
  await con(
    async ({ url, llamadas }) => {
      const r = await pedir(url, "GET", "/aprendizaje-error?ucp=Antioquia");
      assert.equal(r.status, 500);
      assert.equal(r.json.success, false);
      assert.ok(!JSON.stringify(r.json).includes("relation"));
      assert.equal(llamadas.length, 0);
    },
    {
      hoy: () => hoyRetro,
      model: modeloFalso({
        ultimoRealHasta: async () => ultimoRetro,
        emisionesRetro: async () => {
          throw new Error('relation "sesiones" does not exist');
        },
      }),
    },
  );
});

test("emisionesRetro (regla ex-ante): solo P, por fecha, menor codigo guardado >= 3 días antes; un solo recorrido, sin casts", () => {
  const q = emisionesRetro.replace(/\s+/g, " ");
  assert.match(q, /DISTINCT ON \(sp\.fecha\)/);
  assert.match(q, /sp\.tipo = 'P'/);
  assert.doesNotMatch(q, /'PM'/);
  assert.match(q, /s\.fecha < sp\.fecha - INTERVAL '2 days'/); // guardada <= fecha - 3 días
  assert.match(q, /ORDER BY sp\.fecha ASC, s\.codigo ASC/);
  assert.doesNotMatch(q, /date_trunc|::date|fechainicio|fechafin|version ASC/);
  assert.equal((q.match(/sesiones_periodos/g) ?? []).length, 1);
  assert.match(realesRetro, /ORDER BY fecha ASC, codigo ASC/);
  assert.doesNotMatch(reales, /codigo/); // `reales` existente intacto
});

test("lunesDe: lunes de la semana ISO (domingo pertenece a la semana que termina)", () => {
  assert.equal(lunesDe("2030-03-18"), "2030-03-18");
  assert.equal(lunesDe("2030-03-24"), "2030-03-18");
  assert.equal(lunesDe("2030-03-16"), "2030-03-11"); // sábado
});
