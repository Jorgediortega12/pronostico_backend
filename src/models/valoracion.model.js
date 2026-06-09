import pool from "../config/database.js";
import * as q from "../querys/valoracion.query.js";

export default class ValoracionModel {
  static instance;
  static getInstance() {
    if (!ValoracionModel.instance) {
      ValoracionModel.instance = new ValoracionModel();
    }
    return ValoracionModel.instance;
  }

  #tablasListas = false;

  // Garantiza que las tablas existan (idempotente). Se llama de forma perezosa.
  ensureTables = async () => {
    if (this.#tablasListas) return;
    await pool.query(q.ensureTables);
    this.#tablasListas = true;
  };

  // ─── Ofertas ───────────────────────────────────────────────────────────────
  insertOferta = async (params) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.insertOferta, params);
    return rows[0];
  };

  getOfertaById = async (id) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.getOfertaById, [id]);
    return rows[0] || null;
  };

  listOfertas = async (activas = true) => {
    await this.ensureTables();
    const { rows } = await pool.query(activas ? q.listOfertasActivas : q.listOfertas);
    return rows;
  };

  // ─── Escenarios ──────────────────────────────────────────────────────────────
  insertEscenario = async (params) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.insertEscenario, params);
    return rows[0];
  };

  getEscenarioById = async (id) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.getEscenarioById, [id]);
    return rows[0] || null;
  };

  listEscenarios = async (ofertaId = null) => {
    await this.ensureTables();
    const { rows } = ofertaId
      ? await pool.query(q.listEscenariosByOferta, [ofertaId])
      : await pool.query(q.listEscenarios);
    return rows;
  };

  deleteEscenario = async (id) => {
    await this.ensureTables();
    await pool.query(q.deleteEscenario, [id]);
  };

  updateEscenarioIpp = async (id, nuevoIpp) => {
    await this.ensureTables();
    await pool.query(q.updateEscenarioIpp, [id, nuevoIpp]);
  };

  // ─── Resultados ──────────────────────────────────────────────────────────────
  insertResultado = async (params) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.insertResultado, params);
    return rows[0];
  };

  getResultadoById = async (id) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.getResultadoById, [id]);
    return rows[0] || null;
  };

  getResultadosByEscenario = async (escenarioId) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.getResultadosByEscenario, [escenarioId]);
    return rows;
  };

  getMejorResultadoByEscenario = async (escenarioId) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.getMejorResultadoByEscenario, [escenarioId]);
    return rows[0] || null;
  };

  getResultadosMultiobjByEscenario = async (escenarioId) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.getResultadosMultiobjByEscenario, [escenarioId]);
    return rows;
  };

  countResultadosByEscenario = async (escenarioId) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.countResultadosByEscenario, [escenarioId]);
    return rows[0]?.total || 0;
  };

  deleteResultadosByEscenario = async (escenarioId) => {
    await this.ensureTables();
    await pool.query(q.deleteResultadosByEscenario, [escenarioId]);
  };

  // ─── Configuración IPP ─────────────────────────────────────────────────────────
  insertConfiguracionIpp = async (params) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.insertConfiguracionIpp, params);
    return rows[0];
  };

  listConfiguracionesIpp = async () => {
    await this.ensureTables();
    const { rows } = await pool.query(q.listConfiguracionesIpp);
    return rows;
  };

  // ─── Jobs de optimización (background) ───────────────────────────────────────
  upsertJobProcesando = async (escenarioId, tipo, fase) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.upsertJobProcesando, [escenarioId, tipo, fase]);
    return rows[0];
  };

  getJobByEscenario = async (escenarioId) => {
    await this.ensureTables();
    const { rows } = await pool.query(q.getJobByEscenario, [escenarioId]);
    return rows[0] || null;
  };

  updateJobFase = async (escenarioId, fase) => {
    await this.ensureTables();
    await pool.query(q.updateJobFase, [escenarioId, fase]);
  };

  completeJob = async (escenarioId, fase, numResultados) => {
    await this.ensureTables();
    await pool.query(q.completeJob, [escenarioId, fase, numResultados]);
  };

  failJob = async (escenarioId, error) => {
    await this.ensureTables();
    await pool.query(q.failJob, [escenarioId, error]);
  };
}