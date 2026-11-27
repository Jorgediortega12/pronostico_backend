// Prueba de integración de las curvas típicas cargadas (Factores de distribución): validación, guardado, materialización como medidas
// (CT-), balance exacto entre destino y orígenes, tipos de día, fechas nuevas, habilitar/vigencia/eliminar, protecciones y (si el servicio
// de factores está levantado) el cálculo real de FDA y FDP con la barra nueva.
//
// Credenciales solo por variables de entorno: FACTORES_PGHOST FACTORES_PGPORT FACTORES_PGUSER FACTORES_PGPASSWORD FACTORES_PGDATABASE
// El usuario necesita crear tablas, INSERT/UPDATE/DELETE en medidas, agrupaciones y barras, y SELECT en festivos.
// Opcional: FACTORES_URL (por defecto http://127.0.0.1:8003) para la prueba contra el servicio FastAPI.
// Usar SOLO sobre una base de pruebas con datos de un mercado (por ejemplo, una copia de barras/agrupaciones/medidas/festivos).
// Uso: node scripts/factores/probar_curvas_cargadas.mjs
import assert from "node:assert/strict";
import { createConectionPG } from "../../src/helpers/connections.js";
import FactoresCurvasService from "../../src/services/factores_curvas.service.js";
import FactoresCurvasModel from "../../src/models/factores_curvas.model.js";
import { PERIODOS, TIPOS_DIA, tipoDeDia } from "../../src/utils/factoresCurvas.js";

const e = process.env;
const S = { host: e.FACTORES_PGHOST, puerto: e.FACTORES_PGPORT, usuario: e.FACTORES_PGUSER, contrasenia: e.FACTORES_PGPASSWORD, basededatos: e.FACTORES_PGDATABASE };
const MC = e.FACTORES_MC ?? "Antioquia";
const svc = FactoresCurvasService.getInstance();
const mod = FactoresCurvasModel.getInstance();
const pool = createConectionPG(S);
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
const uno = async (sql, params = []) => (await q(sql, params))[0];
const TAG = Date.now().toString(36).toUpperCase();
const DESTINO = `ZZ_IND_${TAG}`;
const DONANTES = ["GUAYABA1", "POBLADO1", "SN_DIEG1", "CENTRAL1"];
const FRACCION = 0.07; // lo que se traslada de cada barra de origen, respecto de su demanda típica

let ok = 0;
const caso = async (nombre, fn) => {
  try { await fn(); ok++; console.log(`  OK   ${nombre}`); }
  catch (err) { console.log(`  FALLA ${nombre}\n        ${err.message}`); process.exitCode = 1; }
};
const falla = (nombre, fn, codigo, texto) => caso(nombre, async () => {
  await assert.rejects(fn, (err) => err.statusCode === codigo && (!texto || texto.test(err.message)), `debía fallar con ${codigo}`);
});
const redondear5 = (v) => Math.round((v + Number.EPSILON) * 1e5) / 1e5;
const cerca = (a, b, tol = 1e-3, msg = "") => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b}`);

// ── Cálculo de referencia: la curva de una barra en una fecha, igual que el módulo (dividir/1000 -> factor -> valor_absoluto) ──────────
const curvaDeBarra = async (barraId, fecha, energia, { conCT = true, ignorarNeg = false } = {}) => {
  const filas = await q(
    `SELECT me.*, a.factor::float AS f, a.dividir_por_1000 AS div, a.valor_absoluto AS abs
     FROM medidas me JOIN agrupaciones a ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo AND a.estado = 1
     WHERE a.barra_id = $1 AND me.fecha = $2 AND substring(me.flujo from 1 for 1) = $3 ${conCT ? "" : "AND me.codigo_rpm NOT LIKE 'CT-%'"}`,
    [barraId, fecha, energia],
  );
  const valor = (r, p) => { const v = (r.div ? (r[p] ?? 0) / 1000 : r[p] ?? 0) * r.f; return r.abs ? Math.abs(v) : v; };
  // «Ignorar negativos»: se descartan las filas reales que quedan negativas tras el factor; las curvas cargadas (CT-) nunca.
  const validas = ignorarNeg ? filas.filter((r) => r.codigo_rpm.startsWith("CT-") || !PERIODOS.some((p) => valor(r, p) < 0)) : filas;
  return PERIODOS.map((p) => validas.reduce((s, r) => s + valor(r, p), 0));
};
const totalSistema = async (fecha, energia, conCT) => {
  const barras = await q(`SELECT id FROM barras WHERE mc = $1 AND estado = 1 AND habilitar = 1`, [MC]);
  const total = Array(24).fill(0);
  for (const b of barras) (await curvaDeBarra(b.id, fecha, energia, { conCT })).forEach((v, i) => { total[i] += v; });
  return total;
};

// ── Preparación ──────────────────────────────────────────────────────────────────────────────────────────────────────────
await mod.asegurarTablas(S);
const ultima = await mod.ultimaFecha(pool, MC);
const barraId = async (nombre) => (await uno(`SELECT id FROM barras WHERE barra = $1 AND mc = $2 AND estado = 1`, [nombre, MC]))?.id;
const ids = Object.fromEntries(await Promise.all(DONANTES.map(async (n) => [n, await barraId(n)])));
assert.ok(Object.values(ids).every(Boolean), `faltan barras de origen en ${MC}`);
const festivosSet = new Set((await q(`SELECT to_char(fecha, 'YYYY-MM-DD') AS f FROM festivos WHERE ucp = $1`, [MC])).map((r) => r.f));

// Curvas de prueba: un 7 % de la demanda típica (en MVA) de cada barra de origen, por tipo de día.
const hasta = ultima;
const desde = new Date(Date.parse(hasta) - 150 * 86400000).toISOString().slice(0, 10);
const portion = {}; // barra -> tipo -> { S, P }
for (const n of DONANTES) {
  const prom = await mod.promedioPorTipoDia(pool, ids[n], desde, hasta, MC);
  portion[n] = {};
  for (const t of TIPOS_DIA) portion[n][t] = prom[t].A.valores.map((p, i) => Math.hypot(p, prom[t].R.valores[i]) * FRACCION);
}
const cuerpo = (extra = {}) => ({
  mc: MC,
  nombre: `Traslado de prueba ${TAG}`,
  destino: { crear: { barra: DESTINO, descripcion: "prueba" } },
  descontar: true,
  componentes: DONANTES.map((n) => ({ origen_barra: n, unidad: "MVA", curvas: portion[n], fp: { modo: "BARRA", barra: n, fecha_inicial: desde, fecha_final: hasta } })),
  ...extra,
});

console.log(`Mercado ${MC}, última fecha ${ultima}, destino ${DESTINO}, TAG=${TAG}\n`);

// ── Validación (no cambia nada) ──────────────────────────────────────────────────────────────────────────────────────────
console.log("Validación");
await caso("la vista previa calcula MW y MVAr con el FP de cada barra y suma el destino", async () => {
  const v = await svc.previsualizar(cuerpo(), S);
  assert.equal(v.destino, DESTINO);
  assert.equal(v.destino_nuevo, true);
  assert.equal(v.componentes.length, 4);
  for (const t of TIPOS_DIA) {
    for (const i of [0, 13, 23]) {
      const sumaP = v.componentes.reduce((s, c) => s + c.curvas[t].P[i], 0);
      cerca(v.suma_destino[t].P[i], sumaP, 1e-3, `suma P ${t} p${i + 1}`);
    }
    assert.ok(v.suma_destino[t].fp.every((f) => f > 0.8 && f <= 1), "FP del destino razonable");
  }
  // MVA original conservado: P² + Q² ≈ S²
  const c0 = v.componentes[0].curvas.ORDINARIO;
  cerca(Math.hypot(c0.P[10], c0.Q[10]), c0.S[10], 1e-3);
  assert.equal(await uno(`SELECT count(*)::int AS n FROM barras WHERE barra = $1`, [DESTINO]).then((r) => r.n), 0, "la vista previa no crea la barra");
  assert.equal(await uno(`SELECT count(*)::int AS n FROM medidas WHERE codigo_rpm LIKE 'CT-%'`).then((r) => r.n), 0, "ni medidas");
});
await falla("falta un tipo de día (400)", () => svc.previsualizar(cuerpo({ componentes: [{ ...cuerpo().componentes[0], curvas: { ORDINARIO: portion.GUAYABA1.ORDINARIO, SABADO: portion.GUAYABA1.SABADO } }] }), S), 400, /FESTIVO/);
await falla("un periodo negativo (400)", () => svc.previsualizar(cuerpo({ componentes: [{ ...cuerpo().componentes[0], curvas: { ...portion.GUAYABA1, SABADO: portion.GUAYABA1.SABADO.map((v, i) => (i === 3 ? -1 : v)) } }] }), S), 400, /periodo 4 es negativo/);
await falla("la barra de origen no existe (404)", () => svc.previsualizar(cuerpo({ componentes: [{ ...cuerpo().componentes[0], origen_barra: "NO_EXISTE" }] }), S), 404, /NO_EXISTE/);
await falla("la barra destino no existe (404)", () => svc.previsualizar(cuerpo({ destino: { barra: "NO_EXISTE" } }), S), 404, /destino/);
await falla("origen igual al destino (400)", () => svc.previsualizar(cuerpo({ destino: { barra: "GUAYABA1" } }), S), 400, /misma que el destino/);
await falla("un origen repetido (400)", () => svc.previsualizar(cuerpo({ componentes: [cuerpo().componentes[0], cuerpo().componentes[0]] }), S), 400, /repetida/);
await falla("la unidad debe ser MVA o MW (400)", () => svc.previsualizar(cuerpo({ componentes: [{ ...cuerpo().componentes[0], unidad: "kW" }] }), S), 400, /MVA o MW/);
await falla("sin factor de potencia (400)", () => svc.previsualizar(cuerpo({ componentes: [{ ...cuerpo().componentes[0], fp: undefined }] }), S), 400, /factor de potencia/);
await falla("factor de potencia fijo fuera de rango (400)", () => svc.previsualizar(cuerpo({ componentes: [{ ...cuerpo().componentes[0], fp: { modo: "FIJO", valor: 1.3 } }] }), S), 400, /mayor que 0 y hasta 1/);
await falla("vigencia al revés (400)", () => svc.previsualizar(cuerpo({ vigente_desde: "2026-11-10", vigente_hasta: "2026-11-01" }), S), 400, /vigencia/);
await falla("sin curvas (400)", () => svc.previsualizar(cuerpo({ componentes: [] }), S), 400, /al menos una curva/);
await falla("sin nombre (400)", () => svc.previsualizar(cuerpo({ nombre: "  " }), S), 400, /nombre/);
await falla("una barra destino nueva que ya existe (409)", () => svc.previsualizar(cuerpo({ destino: { crear: { barra: "GUAYABA1" } } }), S), 409, /Ya existe/);
await caso("si lo que se traslada supera la demanda de la barra de origen, se avisa", async () => {
  const gigante = portion.CENTRAL1.ORDINARIO.map((v) => v * 60);
  const v = await svc.previsualizar(cuerpo({ componentes: [{ ...cuerpo().componentes[3], curvas: { ...portion.CENTRAL1, ORDINARIO: gigante } }] }), S);
  assert.ok(v.avisos.some((a) => /CENTRAL1 \(ORDINARIO\).*supera su demanda/.test(a)), JSON.stringify(v.avisos));
});

// ── Guardado y materialización ───────────────────────────────────────────────────────────────────────────────────────────
console.log("\nGuardado");
let grupo;
await caso("guardar crea la barra destino, el grupo y las curvas", async () => {
  grupo = await svc.guardar(cuerpo(), S);
  assert.equal(grupo.destino, DESTINO);
  assert.equal(grupo.componentes.length, 4);
  assert.deepEqual(grupo.componentes.map((c) => c.origen).sort(), [...DONANTES].sort());
  assert.ok(await barraId(DESTINO), "la barra destino existe");
});
let calendario;
await caso("cada curva queda como medidas AE (activa) y R1 (reactiva) en cada fecha del mercado", async () => {
  calendario = (await q(`SELECT DISTINCT me.fecha FROM medidas me JOIN agrupaciones a ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo JOIN barras b ON b.id = a.barra_id WHERE b.mc = $1 AND a.estado = 1 AND me.codigo_rpm NOT LIKE 'CT-%'`, [MC])).length;
  assert.ok(calendario > 50, `calendario ${calendario}`);
  for (const c of grupo.componentes) {
    for (const lado of ["D", "O"]) {
      for (const flujo of ["AE", "R1"]) {
        const n = (await uno(`SELECT count(*)::int AS n FROM medidas WHERE codigo_rpm = $1 AND flujo = $2`, [`CT-${c.id}-${lado}`, flujo])).n;
        assert.equal(n, calendario, `CT-${c.id}-${lado} ${flujo}`);
      }
    }
  }
});
await caso("las agrupaciones se crean solas: +1 en el destino y -1 en cada origen, marcadas como curva cargada", async () => {
  const d = await q(`SELECT a.codigo_rpm, a.flujo, a.factor, a.revision, a.estado, a.dividir_por_1000, a.valor_absoluto, b.barra FROM agrupaciones a JOIN barras b ON b.id = a.barra_id WHERE a.codigo_rpm LIKE 'CT-%'`);
  assert.equal(d.length, 4 * 2 * 2);
  for (const a of d) {
    assert.equal(a.estado, 1);
    assert.equal(a.revision, "CURVA CARGADA");
    assert.equal(a.dividir_por_1000, false);
    assert.equal(a.valor_absoluto, false);
    if (a.codigo_rpm.endsWith("-D")) { assert.equal(a.factor, "1"); assert.equal(a.barra, DESTINO); }
    else { assert.equal(a.factor, "-1"); assert.ok(DONANTES.includes(a.barra)); }
  }
});

console.log("\nValores y balance");
const fechaDe = async (tipo) => {
  const fs = (await q(`SELECT DISTINCT to_char(me.fecha, 'YYYY-MM-DD') AS f FROM medidas me JOIN agrupaciones a ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo WHERE a.barra_id = $1 AND me.codigo_rpm NOT LIKE 'CT-%' ORDER BY 1 DESC`, [ids.GUAYABA1])).map((r) => r.f);
  return fs.find((f) => tipoDeDia(f, festivosSet) === tipo);
};
const fechas = { ORDINARIO: await fechaDe("ORDINARIO"), SABADO: await fechaDe("SABADO"), FESTIVO: await fechaDe("FESTIVO") };
const destinoId = await barraId(DESTINO);
for (const tipo of TIPOS_DIA) {
  await caso(`${tipo} (${fechas[tipo]}): el destino vale la suma de las porciones y cada origen baja exactamente la suya`, async () => {
    const f = fechas[tipo];
    const detalle = grupo.suma_destino[tipo];
    const pDestino = await curvaDeBarra(destinoId, f, "A");
    const qDestino = await curvaDeBarra(destinoId, f, "R");
    PERIODOS.forEach((_, i) => { cerca(pDestino[i], detalle.P[i], 1e-3, `P destino p${i + 1}`); cerca(qDestino[i], detalle.Q[i], 1e-3, `Q destino p${i + 1}`); });
    for (const n of DONANTES) {
      const antes = await curvaDeBarra(ids[n], f, "A", { conCT: false });
      const despues = await curvaDeBarra(ids[n], f, "A");
      const porcionP = grupo.componentes.find((c) => c.origen === n).curvas[tipo].P;
      PERIODOS.forEach((_, i) => cerca(antes[i] - despues[i], porcionP[i], 1e-3, `${n} baja p${i + 1}`));
      const antesQ = await curvaDeBarra(ids[n], f, "R", { conCT: false });
      const despuesQ = await curvaDeBarra(ids[n], f, "R");
      const porcionQ = grupo.componentes.find((c) => c.origen === n).curvas[tipo].Q;
      PERIODOS.forEach((_, i) => cerca(antesQ[i] - despuesQ[i], porcionQ[i], 1e-3, `${n} Q baja p${i + 1}`));
    }
  });
  await caso(`${tipo}: el total del sistema no cambia (no se cuenta dos veces la carga trasladada)`, async () => {
    const f = fechas[tipo];
    for (const energia of ["A", "R"]) {
      const sin = await totalSistema(f, energia, false);
      const con = await totalSistema(f, energia, true);
      PERIODOS.forEach((_, i) => cerca(con[i], sin[i], 1e-3, `${energia} p${i + 1}`));
    }
  });
}
await caso("el factor de potencia de la barra nueva sale de las barras de origen (entre sus FP)", async () => {
  const fp = grupo.suma_destino.ORDINARIO.fp;
  assert.ok(Math.min(...fp) > 0.85 && Math.max(...fp) <= 1, JSON.stringify(fp));
});

// ── Reglas de tipo de día en fechas nuevas ───────────────────────────────────────────────────────────────────────────────
console.log("\nFechas nuevas (completar)");
const copiarDia = async (fechaNueva) => {
  // Copia las medidas REALES de un día a una fecha nueva (simula que llegaron medidas de un día más).
  await q(`INSERT INTO medidas (flujo, fecha, codigo_rpm, ${PERIODOS.join(", ")}, marcado)
           SELECT flujo, $2::date, codigo_rpm, ${PERIODOS.join(", ")}, '0' FROM medidas WHERE fecha = $1::date AND codigo_rpm NOT LIKE 'CT-%'
           ON CONFLICT (codigo_rpm, fecha, flujo) DO NOTHING`, [ultima, fechaNueva]);
};
const nuevas = { ORDINARIO: "2026-11-25", SABADO: "2026-11-28", FESTIVO: "2026-11-29" }; // miércoles, sábado, domingo
const copiadas = [];
await caso("llegan medidas de un miércoles, un sábado y un domingo: al completar, cada una recibe la curva de su tipo de día", async () => {
  for (const f of Object.values(nuevas)) {
    assert.equal(await uno(`SELECT count(*)::int AS n FROM medidas WHERE fecha = $1::date`, [f]).then((r) => r.n), 0, `${f} debe estar libre para la prueba`);
    await copiarDia(f);
    copiadas.push(f);
  }
  const agregadas = await svc.completarSiHaceFalta(MC, "2026-11-25", "2026-11-29", S);
  assert.ok(agregadas > 0);
  for (const [tipo, f] of Object.entries(nuevas)) {
    const c = grupo.componentes[0];
    const fila = await uno(`SELECT p14 FROM medidas WHERE codigo_rpm = $1 AND fecha = $2::date AND flujo = 'AE'`, [`CT-${c.id}-D`, f]);
    cerca(fila.p14, c.curvas[tipo].P[13], 1e-3, `${tipo} ${f}`);
  }
});
await caso("completar es idempotente: repetirlo no agrega filas", async () => {
  const antes = (await uno(`SELECT count(*)::int AS n FROM medidas WHERE codigo_rpm LIKE 'CT-%'`)).n;
  const otra = await svc.sincronizar({ mc: MC, fecha_inicial: "2026-11-25", fecha_final: "2026-11-29" }, S);
  assert.equal(otra.grupos, 1);
  assert.equal((await uno(`SELECT count(*)::int AS n FROM medidas WHERE codigo_rpm LIKE 'CT-%'`)).n, antes);
});
await caso("un festivo entre semana y un sábado festivo cuentan como FESTIVO", async () => {
  // fecha de la tabla de festivos que sea lunes a viernes o sábado y esté libre de medidas
  const candidatos = (await q(`SELECT to_char(fecha, 'YYYY-MM-DD') AS f FROM festivos WHERE ucp = $1 AND fecha > $2::date ORDER BY fecha`, [MC, ultima])).map((r) => r.f);
  const f = candidatos.find((c) => !copiadas.includes(c));
  if (!f) return; // sin festivos futuros cargados: no hay qué probar
  assert.equal(tipoDeDia(f, festivosSet), "FESTIVO");
  await copiarDia(f);
  copiadas.push(f);
  await svc.completarSiHaceFalta(MC, f, f, S);
  const c = grupo.componentes[0];
  const fila = await uno(`SELECT p14 FROM medidas WHERE codigo_rpm = $1 AND fecha = $2::date AND flujo = 'AE'`, [`CT-${c.id}-D`, f]);
  cerca(fila.p14, c.curvas.FESTIVO.P[13], 1e-3, `festivo ${f}`);
});

// ── Cambios del grupo ────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\nCambios");
await caso("guardar de nuevo con el mismo id reemplaza las curvas sin dejar medidas ni agrupaciones huérfanas", async () => {
  const idsAntes = grupo.componentes.map((c) => c.id);
  const g2 = await svc.guardar({ ...cuerpo({ destino: { barra: DESTINO } }), id: grupo.id }, S);
  assert.equal(g2.componentes.length, 4);
  const idsNuevos = g2.componentes.map((c) => c.id);
  assert.ok(idsNuevos.every((i) => !idsAntes.includes(i)), "ids nuevos");
  for (const i of idsAntes) {
    assert.equal((await uno(`SELECT count(*)::int AS n FROM medidas WHERE codigo_rpm IN ($1, $2)`, [`CT-${i}-D`, `CT-${i}-O`])).n, 0, `huérfanas CT-${i}`);
    assert.equal((await uno(`SELECT count(*)::int AS n FROM agrupaciones WHERE codigo_rpm IN ($1, $2)`, [`CT-${i}-D`, `CT-${i}-O`])).n, 0);
  }
  assert.equal((await uno(`SELECT count(DISTINCT codigo_rpm)::int AS n FROM agrupaciones WHERE codigo_rpm LIKE 'CT-%'`)).n, 8, "8 códigos activos (4 destino + 4 origen)");
  grupo = g2;
});
await falla("el mismo origen no se puede trasladar al mismo destino en dos grupos (409)", () => svc.guardar(cuerpo({ destino: { barra: DESTINO }, nombre: "otro" }), S), 409, /ya se traslada/);
await caso("deshabilitar retira medidas y agrupaciones (los datos quedan); habilitar las devuelve", async () => {
  const off = await svc.habilitar(grupo.id, false, S);
  assert.equal(off.habilitar, 0);
  assert.equal((await uno(`SELECT count(*)::int AS n FROM medidas WHERE codigo_rpm LIKE 'CT-%'`)).n, 0);
  assert.equal((await uno(`SELECT count(*)::int AS n FROM agrupaciones WHERE codigo_rpm LIKE 'CT-%'`)).n, 0);
  assert.equal(grupo.componentes.length, (await svc.detalle(grupo.id, S)).componentes.length, "los datos siguen guardados");
  const on = await svc.habilitar(grupo.id, true, S);
  assert.equal(on.habilitar, 1);
  grupo = on;
  const c = grupo.componentes[0];
  assert.equal((await uno(`SELECT count(*)::int AS n FROM medidas WHERE codigo_rpm = $1 AND flujo = 'AE'`, [`CT-${c.id}-D`])).n, (await uno(`SELECT count(DISTINCT fecha)::int AS n FROM medidas WHERE codigo_rpm NOT LIKE 'CT-%' AND fecha IN (SELECT fecha FROM medidas WHERE codigo_rpm = $1)`, [`CT-${c.id}-D`])).n);
});
await caso("la vigencia limita las fechas con curva (no se generan después de «hasta»)", async () => {
  const g = await svc.guardar({ ...cuerpo({ destino: { barra: DESTINO } }), id: grupo.id, vigente_hasta: ultima.slice(0, 8) + "01" }, S);
  const c = g.componentes[0];
  const maxFecha = (await uno(`SELECT to_char(max(fecha), 'YYYY-MM-DD') AS f FROM medidas WHERE codigo_rpm = $1`, [`CT-${c.id}-D`])).f;
  assert.ok(maxFecha <= ultima.slice(0, 8) + "01", `max ${maxFecha}`);
  grupo = await svc.guardar({ ...cuerpo({ destino: { barra: DESTINO } }), id: grupo.id, vigente_hasta: null }, S); // se vuelve a todo el calendario
});
await caso("curva propia de una barra nueva (MW + FP fijo, sin origen): no resta nada a nadie", async () => {
  const propia = await svc.guardar({
    mc: MC, nombre: `Curva propia ${TAG}`, destino: { crear: { barra: `${DESTINO}_P` } }, descontar: false,
    componentes: [{ origen_barra: null, unidad: "MW", curvas: { ORDINARIO: Array(24).fill(10), SABADO: Array(24).fill(8), FESTIVO: Array(24).fill(6) }, fp: { modo: "FIJO", valor: 0.9 } }],
  }, S);
  const c = propia.componentes[0];
  cerca(c.curvas.ORDINARIO.Q[0], 10 * Math.sqrt(1 - 0.81) / 0.9, 1e-3, "Q derivada del FP");
  assert.equal((await uno(`SELECT count(*)::int AS n FROM medidas WHERE codigo_rpm = $1`, [`CT-${c.id}-O`])).n, 0, "sin lado origen");
  const total = await totalSistema(fechas.ORDINARIO, "A", true);
  const sin = await totalSistema(fechas.ORDINARIO, "A", false);
  cerca(total[5] - sin[5], 10, 1e-3, "esta curva SÍ suma al sistema (es demanda nueva)");
  await svc.eliminar(propia.id, S);
});
await caso("MW con reactiva propia: se respeta la reactiva dada", async () => {
  const g = await svc.guardar({
    mc: MC, nombre: `Con reactiva ${TAG}`, destino: { crear: { barra: `${DESTINO}_Q` } }, descontar: false,
    componentes: [{ origen_barra: null, unidad: "MW", curvas: { ORDINARIO: Array(24).fill(5), SABADO: Array(24).fill(5), FESTIVO: Array(24).fill(5) }, reactiva: { ORDINARIO: Array(24).fill(1.5), SABADO: Array(24).fill(1.5), FESTIVO: Array(24).fill(1.5) } }],
  }, S);
  cerca(g.componentes[0].curvas.SABADO.Q[7], 1.5, 1e-6);
  await svc.eliminar(g.id, S);
});

console.log("\nProtecciones");
await caso("no se editan a mano las agrupaciones ni las medidas de una curva cargada", async () => {
  const c = grupo.componentes[0];
  assert.throws(() => svc.exigirNoCurva(`CT-${c.id}-D`, "editar"), (er) => er.statusCode === 409 && /curva cargada/.test(er.message));
  assert.doesNotThrow(() => svc.exigirNoCurva("Guayaba110kVswTrafo2"));
  const ag = await uno(`SELECT id FROM agrupaciones WHERE codigo_rpm = $1 AND flujo = 'AE'`, [`CT-${c.id}-D`]);
  await assert.rejects(() => svc.exigirAgrupacionNoCurva(ag.id, S, "eliminar"), (er) => er.statusCode === 409);
  const real = await uno(`SELECT id FROM agrupaciones WHERE codigo_rpm NOT LIKE 'CT-%' LIMIT 1`);
  await svc.exigirAgrupacionNoCurva(real.id, S, "eliminar");
});
await falla("una barra con curvas no se puede eliminar (409)", () => svc.exigirBarraSinCurvas(ids.GUAYABA1, S), 409, /Elimina primero/);
await caso("una barra sin curvas sí", async () => { await svc.exigirBarraSinCurvas((await uno(`SELECT id FROM barras WHERE mc = $1 AND estado = 1 AND id NOT IN (SELECT destino_barra_id FROM factores_curvas_grupos) AND barra NOT IN ('GUAYABA1','POBLADO1','SN_DIEG1','CENTRAL1') LIMIT 1`, [MC])).id, S); });

// ── Servicio de factores (FastAPI): cálculo real de FDA y FDP con la barra nueva ──────────────────────────────────────────
console.log("\nCálculo real de FDA y FDP");
const URL_FACTORES = e.FACTORES_URL ?? "http://127.0.0.1:8003";
const dsn = `postgresql://${S.usuario}:${S.contrasenia}@${S.host}:${S.puerto}/${S.basededatos}`;
const disponible = await fetch(`${URL_FACTORES}/factores/calculos/health`).then((r) => r.ok).catch(() => false);
if (!disponible) {
  console.log("  (omitido) el servicio de factores no responde en " + URL_FACTORES);
} else {
  const f = fechas.ORDINARIO;
  // el servicio devuelve y espera las fechas de las curvas como DD-MM-AAAA
  const fechaDMA = f.split("-").reverse().join("-");
  const barras = (await q(`SELECT id, barra FROM barras WHERE mc = $1 AND estado = 1 AND habilitar = 1 ORDER BY id`, [MC]));
  const conMedida = [];
  for (const b of barras) if ((await curvaDeBarra(b.id, f, "A")).some((v) => v !== 0)) conMedida.push(b);
  const cuerpoFactores = { fecha_inicial: f, fecha_final: f, mc: MC, tipo_dia: "ORDINARIO", curvas_tipicas: conMedida.map((b) => ({ barra: b.barra, fecha: fechaDMA })), ignorar_negativos: false, database_url: dsn };
  const llamar = async (ruta) => (await (await fetch(`${URL_FACTORES}/factores/calculos/${ruta}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpoFactores) })).json());
  await caso("el servicio calcula el FDA con la barra nueva y coincide con el cálculo de referencia (suman 1 por periodo)", async () => {
    const r = await llamar("fda");
    assert.equal(r.ok, true, JSON.stringify(r).slice(0, 300));
    const factores = Object.values(r.resultado.factores);
    const deBarra = (n) => factores.find((x) => x.barra === n);
    assert.ok(deBarra(DESTINO), "la barra nueva aparece en el FDA");
    // Referencia: la misma regla del servicio (cada reparto se redondea a 5 decimales y el residuo para sumar 1 va a la barra de mayor peso).
    const curvasPorBarra = new Map();
    for (const b of conMedida) curvasPorBarra.set(b.barra, await curvaDeBarra(b.id, f, "A"));
    for (const i of [0, 9, 13, 20]) {
      const total = [...curvasPorBarra.values()].reduce((a, c) => a + c[i], 0);
      const reparto = new Map([...curvasPorBarra].map(([n, c]) => [n, redondear5(c[i] / total)]));
      const residuo = 1 - [...reparto.values()].reduce((a, v) => a + v, 0);
      const mayor = [...reparto].sort((a, b) => b[1] - a[1])[0][0];
      reparto.set(mayor, redondear5(reparto.get(mayor) + residuo));
      for (const [n, esperado] of reparto) cerca(deBarra(n)[`p${i + 1}`], esperado, 1.1e-5, `FDA ${n} p${i + 1}`);
      cerca(factores.reduce((a, x) => a + x[`p${i + 1}`], 0), 1, 2e-5, `suma p${i + 1}`);
    }
    assert.ok(deBarra(DESTINO)[`p14`] > 0, "la barra nueva pesa algo");
  });
  await caso("con «ignorar negativos» activo, lo que se resta a las barras de origen NO se descarta", async () => {
    const r = await (await fetch(`${URL_FACTORES}/factores/calculos/fda`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cuerpoFactores, ignorar_negativos: true }) })).json();
    assert.equal(r.ok, true, JSON.stringify(r).slice(0, 300));
    const fs = Object.values(r.resultado.factores);
    assert.ok(fs.find((x) => x.barra === DESTINO), "la barra nueva sigue en el cálculo");
    // Referencia con el mismo descarte de filas REALES negativas y las curvas CT- intactas.
    const curvas = new Map();
    for (const b of conMedida) curvas.set(b.barra, await curvaDeBarra(b.id, f, "A", { ignorarNeg: true }));
    for (const n of DONANTES) {
      const sinCurva = (await curvaDeBarra(ids[n], f, "A", { conCT: false, ignorarNeg: true }))[13];
      assert.ok(curvas.get(n)[13] < sinCurva - 1e-6, `${n}: la porción trasladada sí se resta con «ignorar negativos»`);
    }
    for (const i of [0, 13]) {
      const total = [...curvas.values()].reduce((a, c) => a + c[i], 0);
      // tolerancia: el residuo de redondeo (hasta ~n/2·1e-5) se le suma a la barra de mayor peso
      for (const n of [...DONANTES, DESTINO]) cerca(fs.find((x) => x.barra === n)[`p${i + 1}`], curvas.get(n)[i] / total, 3e-4, `${n} p${i + 1}`);
    }
  });
  await caso("el FDP de la barra nueva es el factor de potencia de su curva (cos·atan(Q/P))", async () => {
    const r = await llamar("fdp");
    assert.equal(r.ok, true, JSON.stringify(r).slice(0, 300));
    const fila = Object.values(r.resultado.factores).find((x) => x.barra === DESTINO);
    assert.ok(fila, "la barra nueva aparece en el FDP");
    const esperado = grupo.suma_destino.ORDINARIO.fp;
    for (const i of [0, 9, 13, 20]) cerca(fila[`fdp_p${i + 1}`] ?? fila[`p${i + 1}`], esperado[i], 2e-5, `FDP p${i + 1}`);
  });
}

// ── Eliminar y limpiar ───────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\nEliminar");
await caso("eliminar el grupo borra sus medidas, agrupaciones y datos", async () => {
  await svc.eliminar(grupo.id, S);
  assert.equal((await uno(`SELECT count(*)::int AS n FROM medidas WHERE codigo_rpm LIKE 'CT-%'`)).n, 0);
  assert.equal((await uno(`SELECT count(*)::int AS n FROM agrupaciones WHERE codigo_rpm LIKE 'CT-%'`)).n, 0);
  assert.equal((await uno(`SELECT count(*)::int AS n FROM factores_curvas_grupos`)).n, 0);
  assert.equal((await uno(`SELECT count(*)::int AS n FROM factores_curvas_valores`)).n, 0);
  await assert.rejects(() => svc.detalle(grupo.id, S), (er) => er.statusCode === 404);
});

// Limpieza de lo que creó la prueba (las barras nuevas y las medidas copiadas).
for (const f of copiadas) await q(`DELETE FROM medidas WHERE fecha = $1::date AND codigo_rpm NOT LIKE 'CT-%'`, [f]);
await q(`DELETE FROM barras WHERE barra LIKE $1`, [`${DESTINO}%`]);

console.log(`\n${process.exitCode ? "HAY FALLAS" : "TODO OK"} (${ok} casos correctos)`);
await pool.end().catch(() => {});
process.exit(process.exitCode ?? 0);
