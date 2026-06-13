import pool from "../config/database.js";
import * as q from "../querys/cubrimiento.query.js";

export default class CubrimientoModel {
  static instance;
  static getInstance() {
    if (!CubrimientoModel.instance) {
      CubrimientoModel.instance = new CubrimientoModel();
    }
    return CubrimientoModel.instance;
  }

  // ─── Contratos ───────────────────────────────────────────────────────────────

  getContratoById = async (id) => {
    const { rows } = await pool.query(q.getContratoById, [id]);
    return rows[0] || null;
  };

  getContratosByAnio = async (anio) => {
    const { rows } = await pool.query(q.getContratosByAnio, [anio]);
    return rows;
  };

  getContratoBySicAnio = async (codigoSic, anio) => {
    const { rows } = await pool.query(q.getContratoBySicAnio, [codigoSic, anio]);
    return rows[0] || null;
  };

  getAniosContratos = async () => {
    const { rows } = await pool.query(q.getAniosContratos);
    return rows.map((r) => r.anio);
  };

  insertContrato = async (nombre, datos, codigoSic, anio) => {
    const { rows } = await pool.query(q.insertContrato, [nombre, datos, codigoSic, anio]);
    return rows[0];
  };

  updateContrato = async (id, nombre, datos) => {
    await pool.query(q.updateContrato, [nombre, datos, id]);
  };

  // ─── Porcentaje de cubrimiento ───────────────────────────────────────────────

  getPorcentajeByAnio = async (anio) => {
    const { rows } = await pool.query(q.getPorcentajeByAnio, [anio]);
    return rows;
  };

  savePorcentaje = async (anio, valores) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(q.deletePorcentajeByAnio, [anio]);
      for (let mes = 1; mes <= valores.length; mes++) {
        await client.query(q.insertPorcentaje, [anio, mes, valores[mes - 1]]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };
}