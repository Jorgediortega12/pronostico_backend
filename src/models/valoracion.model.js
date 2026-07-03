import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/valoracion.query.js";

export default class ValoracionModel {
  static instance;
  static getInstance() {
    if (!ValoracionModel.instance) {
      ValoracionModel.instance = new ValoracionModel();
    }
    return ValoracionModel.instance;
  }

  #tablasListas = new Set();

  #db = (session) => createConectionPG(session);

  ensureTables = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#tablasListas.has(key)) return;
    await this.#db(session).query(q.ensureTables);
    this.#tablasListas.add(key);
  };

  // ─── Ofertas ───────────────────────────────────────────────────────────────
  insertOferta = async (session, params) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.insertOferta, params);
    return rows[0];
  };

  getOfertaById = async (session, id) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getOfertaById, [id]);
    return rows[0] || null;
  };

  listOfertas = async (session, activas = true) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(activas ? q.listOfertasActivas : q.listOfertas);
    return rows;
  };

  // ─── Escenarios ──────────────────────────────────────────────────────────────
  insertEscenario = async (session, params) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.insertEscenario, params);
    return rows[0];
  };

  getEscenarioById = async (session, id) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getEscenarioById, [id]);
    return rows[0] || null;
  };

  listEscenarios = async (session, ofertaId = null) => {
    await this.ensureTables(session);
    const { rows } = ofertaId
      ? await this.#db(session).query(q.listEscenariosByOferta, [ofertaId])
      : await this.#db(session).query(q.listEscenarios);
    return rows;
  };

  deleteEscenario = async (session, id) => {
    await this.ensureTables(session);
    await this.#db(session).query(q.deleteEscenario, [id]);
  };

  updateEscenarioIpp = async (session, id, nuevoIpp) => {
    await this.ensureTables(session);
    await this.#db(session).query(q.updateEscenarioIpp, [id, nuevoIpp]);
  };

  // ─── Resultados ──────────────────────────────────────────────────────────────
  insertResultado = async (session, params) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.insertResultado, params);
    return rows[0];
  };

  getResultadoById = async (session, id) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getResultadoById, [id]);
    return rows[0] || null;
  };

  getResultadosByEscenario = async (session, escenarioId) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getResultadosByEscenario, [escenarioId]);
    return rows;
  };

  getMejorResultadoByEscenario = async (session, escenarioId) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getMejorResultadoByEscenario, [escenarioId]);
    return rows[0] || null;
  };

  getResultadosMultiobjByEscenario = async (session, escenarioId) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getResultadosMultiobjByEscenario, [escenarioId]);
    return rows;
  };

  countResultadosByEscenario = async (session, escenarioId) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.countResultadosByEscenario, [escenarioId]);
    return rows[0]?.total || 0;
  };

  deleteResultadosByEscenario = async (session, escenarioId) => {
    await this.ensureTables(session);
    await this.#db(session).query(q.deleteResultadosByEscenario, [escenarioId]);
  };

  // ─── Configuración IPP ─────────────────────────────────────────────────────────
  insertConfiguracionIpp = async (session, params) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.insertConfiguracionIpp, params);
    return rows[0];
  };

  listConfiguracionesIpp = async (session) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.listConfiguracionesIpp);
    return rows;
  };

  // ─── Jobs de optimización (background) ───────────────────────────────────────
  upsertJobProcesando = async (session, escenarioId, tipo, fase) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.upsertJobProcesando, [escenarioId, tipo, fase]);
    return rows[0];
  };

  getJobByEscenario = async (session, escenarioId) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getJobByEscenario, [escenarioId]);
    return rows[0] || null;
  };

  updateJobFase = async (session, escenarioId, fase) => {
    await this.ensureTables(session);
    await this.#db(session).query(q.updateJobFase, [escenarioId, fase]);
  };

  completeJob = async (session, escenarioId, fase, numResultados) => {
    await this.ensureTables(session);
    await this.#db(session).query(q.completeJob, [escenarioId, fase, numResultados]);
  };

  failJob = async (session, escenarioId, error) => {
    await this.ensureTables(session);
    await this.#db(session).query(q.failJob, [escenarioId, error]);
  };

  insertVersion = async (session, { ofertaId, userId, sessionId, nombre, payload }) => {
    await this.ensureTables(session);
    const db = this.#db(session);
    const { rows: nextRows } = await db.query(q.getNextValoracionVersion, [ofertaId ?? null]);
    const version = nextRows[0].next;
    const { rows } = await db.query(q.insertValoracionVersion, [
      ofertaId ?? null, version, userId ?? null, sessionId ?? null, nombre ?? null,
      payload ? JSON.stringify(payload) : null,
    ]);
    return { id: rows[0].id, version: rows[0].version, created_at: rows[0].created_at };
  };

  listVersions = async (session, ofertaId) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.listValoracionVersions, [ofertaId]);
    return rows;
  };

  getVersionById = async (session, versionId) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getValoracionVersionById, [versionId]);
    return rows[0] || null;
  };
}
