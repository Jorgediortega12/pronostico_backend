import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/factores_curvas.query.js";
import { FLUJO_ACTIVA, FLUJO_REACTIVA, PERIODOS, TIPOS_DIA, codigoDestino, codigoOrigen } from "../utils/factoresCurvas.js";

// Acceso a datos de las curvas típicas cargadas. `db` es la conexión de la empresa (createConectionPG) o la de una transacción.
const tablasAseguradas = new Set();

const claveSesion = (s) => `${s.host}:${s.puerto}/${s.basededatos}:${s.usuario}`;

export default class FactoresCurvasModel {
  static instance;
  static getInstance() {
    if (!FactoresCurvasModel.instance) FactoresCurvasModel.instance = new FactoresCurvasModel();
    return FactoresCurvasModel.instance;
  }

  filas = async (db, sql, params = []) => (await db.query(sql, params)).rows;
  una = async (db, sql, params = []) => (await db.query(sql, params)).rows[0] ?? null;
  ejecutar = async (db, sql, params = []) => (await db.query(sql, params)).rowCount;

  /** Crea las tablas propias si faltan (una vez por proceso y base de datos). `session` es la de la empresa. */
  asegurarTablas = async (session) => {
    const clave = claveSesion(session);
    if (tablasAseguradas.has(clave)) return;
    await createConectionPG(session).query(q.asegurarTablas);
    tablasAseguradas.add(clave);
  };

  /** Ejecuta fn(tx) dentro de una transacción con una conexión propia (commit si termina bien, rollback si lanza). */
  transaccion = async (session, fn) => {
    const tx = createConectionPG(session);
    await tx.connect(); // reserva una conexión del pool para toda la transacción
    try {
      await tx.query("BEGIN");
      const r = await fn(tx);
      await tx.query("COMMIT");
      return r;
    } catch (err) {
      await tx.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      await tx.end(); // la devuelve al pool
    }
  };

  // ── Barras ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  barraPorNombre = (db, nombre, mc) => this.una(db, q.barraPorNombre, [nombre, mc]);
  barraPorId = (db, id) => this.una(db, q.barraPorId, [id]);
  barrasPorIds = async (db, ids) => new Map((await this.filas(db, q.barrasPorIds, [ids])).map((b) => [b.id, b.barra]));
  crearBarra = (db, { barra, descripcion, nivel_tension, observaciones, mc }) =>
    this.una(db, q.crearBarra, [barra, descripcion ?? "", nivel_tension ?? null, observaciones ?? "", mc]);

  // ── Grupos, componentes y valores ────────────────────────────────────────────────────────────────────────────────────
  /** Grupos del mercado con sus componentes y valores (para listar y para el detalle). */
  listarGrupos = async (db, mc) => this.#armar(db, await this.filas(db, q.listarGrupos, [mc]));

  obtenerGrupo = async (db, id) => {
    const grupo = await this.una(db, q.grupoPorId, [id]);
    return grupo ? (await this.#armar(db, [grupo]))[0] : null;
  };

  #armar = async (db, grupos) => {
    if (grupos.length === 0) return [];
    const componentes = await this.filas(db, q.componentesDeGrupos, [grupos.map((g) => g.id)]);
    const valores = componentes.length ? await this.filas(db, q.valoresDeComponentes, [componentes.map((c) => c.id)]) : [];
    return grupos.map((g) => ({
      ...g,
      componentes: componentes
        .filter((c) => c.grupo_id === g.id)
        .map((c) => {
          const curvas = {};
          for (const v of valores.filter((x) => x.componente_id === c.id)) {
            (curvas[v.tipo_dia] ??= {})[v.dato] = PERIODOS.map((p) => Number(v[p]));
          }
          return { ...c, curvas };
        }),
    }));
  };

  insertarGrupo = async (db, g) =>
    (await this.una(db, q.insertarGrupo, [g.mc, g.nombre, g.destino_barra_id, g.descontar, g.habilitar, g.vigente_desde, g.vigente_hasta, g.observaciones])).id;

  actualizarGrupo = (db, id, g) =>
    this.ejecutar(db, q.actualizarGrupo, [id, g.nombre, g.destino_barra_id, g.descontar, g.habilitar, g.vigente_desde, g.vigente_hasta, g.observaciones]);

  cambiarHabilitar = (db, id, habilitar) => this.ejecutar(db, q.cambiarHabilitarGrupo, [id, habilitar]);
  eliminarGrupo = (db, id) => this.ejecutar(db, q.eliminarGrupo, [id]);
  idsDeComponentes = async (db, grupoId) => (await this.filas(db, q.idsDeComponentesDeGrupo, [grupoId])).map((r) => r.id);
  borrarComponentes = (db, grupoId) => this.ejecutar(db, q.borrarComponentesDeGrupo, [grupoId]);
  origenesDuplicados = (db, mc, destinoId, grupoId, origenIds) => this.filas(db, q.origenesDuplicados, [mc, destinoId, grupoId ?? 0, origenIds]);

  /** Inserta un componente con sus valores. curvas: { TIPO_DIA: { S?, P, Q } } con arrays de 24. Devuelve el id. */
  insertarComponente = async (db, grupoId, c) => {
    const { id } = await this.una(db, q.insertarComponente, [grupoId, c.origen_barra_id, c.unidad, c.fp_modo, c.fp_valor ?? null, c.fp_barra_id ?? null, c.fp_desde ?? null, c.fp_hasta ?? null]);
    for (const tipo of TIPOS_DIA) {
      for (const dato of ["S", "P", "Q"]) {
        const valores = c.curvas[tipo]?.[dato];
        if (valores) await db.query(q.insertarValores, [id, tipo, dato, ...valores]);
      }
    }
    return id;
  };

  // ── Materialización ──────────────────────────────────────────────────────────────────────────────────────────────────
  /** Códigos reservados (destino y origen) de una lista de componentes. */
  codigosDeComponentes = (componenteIds) => componenteIds.flatMap((id) => [codigoDestino(id), codigoOrigen(id)]);

  /** Quita la materialización de esos códigos: sus medidas y sus agrupaciones. */
  retirar = async (db, componenteIds) => {
    if (componenteIds.length === 0) return;
    const codigos = this.codigosDeComponentes(componenteIds);
    await this.ejecutar(db, q.borrarMedidasDeCodigos, [codigos]);
    await this.ejecutar(db, q.borrarAgrupacionesDeCodigos, [codigos]);
  };

  /**
   * Crea las agrupaciones (destino con factor 1, origen con factor -1) y las medidas de un componente.
   * rango: { desde, hasta } opcional (por defecto todo el calendario); vigencia: { desde, hasta }; sobrescribir: actualizar lo existente.
   */
  materializarComponente = async (db, { mc, componenteId, destinoBarraId, origenBarraId, descontar, vigencia, rango = {}, sobrescribir = true, crearAgrupaciones = true }) => {
    const lados = [{ codigo: codigoDestino(componenteId), barraId: destinoBarraId, factor: "1" }];
    if (descontar && origenBarraId) lados.push({ codigo: codigoOrigen(componenteId), barraId: origenBarraId, factor: "-1" });
    let filas = 0;
    for (const lado of lados) {
      for (const [flujo, dato] of [[FLUJO_ACTIVA, "P"], [FLUJO_REACTIVA, "Q"]]) {
        if (crearAgrupaciones && (await this.ejecutar(db, q.actualizarAgrupacionCurva, [lado.barraId, lado.codigo, flujo, lado.factor])) === 0) {
          await db.query(q.insertarAgrupacionCurva, [lado.barraId, lado.codigo, flujo, lado.factor]);
        }
        filas += await this.ejecutar(db, q.materializarMedidas(sobrescribir), [mc, flujo, rango.desde ?? null, rango.hasta ?? null, vigencia?.desde ?? null, vigencia?.hasta ?? null, lado.codigo, componenteId, dato]);
      }
    }
    return filas;
  };

  gruposQueUsanBarra = (db, barraId) => this.filas(db, q.gruposQueUsanBarra, [barraId]);
  agrupacionPorId = (db, id) => this.una(db, q.agrupacionPorId, [id]);
  codigosActivos = (db, mc) => this.filas(db, q.codigosActivos, [mc]);
  ultimaFecha = async (db, mc) => (await this.una(db, q.ultimaFechaDelMercado, [mc]))?.fecha ?? null;

  /** ¿Faltan fechas por materializar para ese código dentro del rango? */
  faltanFechas = async (db, mc, desde, hasta, codigo, vigencia) =>
    (await this.una(db, q.fechasFaltantes, [mc, desde, hasta, codigo, vigencia?.desde ?? null, vigencia?.hasta ?? null]))?.faltan ?? 0;

  /** Promedios por tipo de día de P y Q de una barra (medidas reales): { ORDINARIO: { A: {dias, valores}, R: {...} }, ... }. */
  promedioPorTipoDia = async (db, barraId, desde, hasta, mc) => {
    const filas = await this.filas(db, q.promedioPorTipoDia, [barraId, desde, hasta, mc]);
    const salida = {};
    for (const f of filas) (salida[f.tipo_dia] ??= {})[f.energia] = { dias: f.dias, valores: PERIODOS.map((p) => Number(f[p])) };
    return salida;
  };
}
