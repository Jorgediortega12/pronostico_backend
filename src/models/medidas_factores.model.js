import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/medidas_factores.query.js";

export default class MedidasFactoresModel {
  static instance;
  static getInstance() {
    if (!MedidasFactoresModel.instance) {
      MedidasFactoresModel.instance = new MedidasFactoresModel();
    }
    return MedidasFactoresModel.instance;
  }

  #db = (session) => createConectionPG(session);

  listar = async (
    session,
    {
      mc,
      barraId,
      codigoRpm,
      flujo,
      fechaInicio,
      fechaFin,
      limit,
      offset,
      sortBy,
      sortDir,
    },
  ) => {
    const db = this.#db(session);
    const filtros = [
      mc,
      barraId ?? null,
      codigoRpm ?? null,
      flujo ?? null,
      fechaInicio ?? null,
      fechaFin ?? null,
    ];
    const orderBy = q.construirOrderBy(sortBy, sortDir);
    const [{ rows }, { rows: countRows }] = await Promise.all([
      db.query(q.listarMedidas(orderBy), [...filtros, limit, offset]),
      db.query(q.contarMedidas, filtros),
    ]);
    return { rows, total: parseInt(countRows[0].total, 10) };
  };

  contarSignoNegativo = async (
    session,
    { mc, fechaInicio, fechaFin, barraId, codigoRpm, flujo },
  ) => {
    const db = this.#db(session);
    const { rows } = await db.query(q.contarSignoNegativo, [
      mc,
      fechaInicio,
      fechaFin,
      barraId ?? null,
      codigoRpm ?? null,
      flujo ?? null,
    ]);
    return {
      total: parseInt(rows[0].total, 10),
      fechas: parseInt(rows[0].fechas, 10),
    };
  };

  invertirSignoNegativo = async (
    session,
    { mc, fechaInicio, fechaFin, barraId, codigoRpm, flujo },
  ) => {
    const db = this.#db(session);
    const { rows } = await db.query(q.invertirSignoNegativo, [
      mc,
      fechaInicio,
      fechaFin,
      barraId ?? null,
      codigoRpm ?? null,
      flujo ?? null,
    ]);
    const fechasUnicas = new Set(rows.map((r) => String(r.fecha)));
    return { total: rows.length, fechas: fechasUnicas.size };
  };
}
