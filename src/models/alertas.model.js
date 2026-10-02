import dotenv from "dotenv";
dotenv.config();
import pkg from "pg";
const { Client } = pkg;
import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/alertas.query.js";

export default class AlertasModel {
  static instance;
  static getInstance() {
    if (!AlertasModel.instance) {
      AlertasModel.instance = new AlertasModel();
    }
    return AlertasModel.instance;
  }

  #db = (session) => createConectionPG(session);

  // datos_clima vive en jano_proxy — conexión fija y compartida (no por
  // sesión/tenant), mismo patrón que ConfigCiudadesClimaModel.
  #dbProxy = () =>
    new Client({
      user: process.env.POSTGRES_USER_PROXY,
      host: process.env.POSTGRES_HOST_PROXY || "localhost",
      database: process.env.POSTGRES_DB_PROXY,
      password: process.env.POSTGRES_PASSWORD_PROXY,
      port: process.env.POSTGRES_PORT_PROXY || 5432,
    });

  #tablasListas = new Set();

  ensureTables = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#tablasListas.has(key)) return;
    const db = this.#db(session);
    await db.query(q.ensureAlertasTables);
    await db.query(q.seedAlertasConfigDefaults);
    this.#tablasListas.add(key);
  };

  // ─── Configuración ────────────────────────────────────────────────────────

  getConfig = async (session) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getAlertasConfig);
    return rows;
  };

  updateConfig = async (session, categoria, cfg) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.updateAlertasConfigByCategoria, [
      cfg.umbral,
      cfg.ventana_dias ?? null,
      cfg.activo ?? true,
      cfg.canal_push ?? true,
      cfg.canal_correo ?? false,
      cfg.canal_sms ?? false,
      JSON.stringify(cfg.destinatarios ?? []),
      categoria,
    ]);
    return rows[0] || null;
  };

  // ─── Mercados ─────────────────────────────────────────────────────────────

  listarUcpActivos = async (session) => {
    const { rows } = await this.#db(session).query(q.listarUcpActivos);
    return rows.map((r) => r.mc);
  };

  // ─── Datos fuente ─────────────────────────────────────────────────────────

  getUltimaFechaMedidasPorMc = async (session, mc) => {
    const { rows } = await this.#db(session).query(q.getUltimaFechaMedidasPorMc, [mc]);
    return rows[0]?.fecha || null;
  };

  getMedidasVentanaPorMc = async (session, mc, fechaInicio, fechaFin) => {
    const { rows } = await this.#db(session).query(q.getMedidasVentanaPorMc, [mc, fechaInicio, fechaFin]);
    return rows;
  };

  existeAlertaMedidaReciente = async (session, ucp, referencia, desde, hasta) => {
    const { rows } = await this.#db(session).query(q.existeAlertaMedidaReciente, [ucp, referencia, desde, hasta]);
    return rows.length > 0;
  };

  getUltimaFechaReal = async (session, ucp) => {
    const { rows } = await this.#db(session).query(q.getUltimaFechaReal, [ucp]);
    return rows[0]?.fecha || null;
  };

  getRealYPronosticoPorFecha = async (session, ucp, fecha) => {
    const { rows } = await this.#db(session).query(q.getRealYPronosticoPorFecha, [ucp, fecha]);
    return rows[0] || null;
  };

  getRealYPronosticoRango = async (session, ucp, fechaInicio, fechaFin) => {
    const { rows } = await this.#db(session).query(q.getRealYPronosticoRango, [
      ucp,
      fechaInicio,
      fechaFin,
    ]);
    return rows;
  };

  getFestivosPorUcpDesde = async (session, ucp, fechaDesde) => {
    const { rows } = await this.#db(session).query(q.getFestivosPorUcpDesde, [ucp, fechaDesde]);
    return rows;
  };

  getTemperaturaPromedioPorFecha = async (ucp, fecha) => {
    const client = this.#dbProxy();
    await client.connect();
    try {
      const { rows } = await client.query(q.getTemperaturaPromedioPorFecha, [ucp, fecha]);
      return rows[0]?.temp_promedio != null ? Number(rows[0].temp_promedio) : null;
    } finally {
      await client.end();
    }
  };

  getTemperaturaPromedioTipico = async (ucp, fecha, ventanaDias) => {
    const client = this.#dbProxy();
    await client.connect();
    try {
      const { rows } = await client.query(q.getTemperaturaPromedioTipico, [ucp, fecha, ventanaDias]);
      const fila = rows[0];
      if (!fila || fila.promedio == null || Number(fila.muestras) === 0) return null;
      return { promedio: Number(fila.promedio), muestras: Number(fila.muestras) };
    } finally {
      await client.end();
    }
  };

  getTotalDiarioReal = async (session, ucp, fecha) => {
    const { rows } = await this.#db(session).query(q.getTotalDiarioReal, [ucp, fecha]);
    return rows[0]?.total != null ? Number(rows[0].total) : null;
  };

  getPromedioTotalDiarioTipico = async (session, ucp, fecha, ventanaDias) => {
    const { rows } = await this.#db(session).query(q.getPromedioTotalDiarioTipico, [
      ucp,
      fecha,
      ventanaDias,
    ]);
    const fila = rows[0];
    if (!fila || fila.promedio == null || Number(fila.muestras) === 0) return null;
    return { promedio: Number(fila.promedio), muestras: Number(fila.muestras) };
  };

  // ─── Alertas ──────────────────────────────────────────────────────────────

  insertAlerta = async (session, alerta) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.insertAlerta, [
      alerta.ucp,
      alerta.categoria,
      alerta.fecha,
      alerta.periodo_inicio ?? null,
      alerta.periodo_fin ?? null,
      alerta.descripcion,
      alerta.metrica_valor,
      alerta.metrica_label,
      alerta.umbral,
      alerta.estado,
      alerta.referencia ?? null,
      alerta.detalle ? JSON.stringify(alerta.detalle) : null,
    ]);
    return rows[0] || null; // null si ya existía (ON CONFLICT DO NOTHING)
  };

  getAlertaByCodigo = async (session, codigo) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getAlertaByCodigo, [codigo]);
    return rows[0] || null;
  };

  marcarRevisada = async (session, codigo) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.marcarAlertaRevisada, [codigo]);
    return rows[0] || null;
  };

  insertHistorial = async (session, alertaId, tipoEvento, descripcion) => {
    await this.#db(session).query(q.insertHistorial, [alertaId, tipoEvento, descripcion]);
  };

  getHistorialByAlertaId = async (session, alertaId) => {
    await this.ensureTables(session);
    const { rows } = await this.#db(session).query(q.getHistorialByAlertaId, [alertaId]);
    return rows;
  };

  // Listado con filtros dinámicos — construye el WHERE de forma parametrizada
  // (nunca interpola valores del usuario en el string SQL).
  listarAlertas = async (session, filtros = {}) => {
    await this.ensureTables(session);
    const { categoria, ucp, fecha_inicio, fecha_fin, estado } = filtros;

    const condiciones = [];
    const valores = [];

    if (categoria && categoria !== "todas") {
      valores.push(categoria);
      condiciones.push(`categoria = $${valores.length}`);
    }
    if (ucp) {
      valores.push(ucp);
      condiciones.push(`ucp = $${valores.length}`);
    }
    if (fecha_inicio) {
      valores.push(fecha_inicio);
      condiciones.push(`fecha >= $${valores.length}`);
    }
    if (fecha_fin) {
      valores.push(fecha_fin);
      condiciones.push(`fecha <= $${valores.length}`);
    }
    if (estado) {
      valores.push(estado);
      condiciones.push(`estado = $${valores.length}`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
    const sql = `
      SELECT codigo, ucp, categoria, fecha, periodo_inicio, periodo_fin, descripcion,
             metrica_valor, metrica_label, umbral, estado, creado_en, revisado_en,
             referencia
      FROM alertas
      ${where}
      ORDER BY fecha DESC, creado_en DESC
    `;
    const { rows } = await this.#db(session).query(sql, valores);
    return rows;
  };
}
