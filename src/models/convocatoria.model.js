import pool from "../config/database.js";
import * as q from "../querys/convocatoria.query.js";

const TABLAS_PERMITIDAS = new Set(
  Object.values(q.CARPETAS).map((c) => c.tabla)
);

const assertTabla = (tabla) => {
  if (!TABLAS_PERMITIDAS.has(tabla)) {
    throw new Error(`Tabla no permitida: ${tabla}`);
  }
};

export default class ConvocatoriaModel {
  static instance;
  static getInstance() {
    if (!ConvocatoriaModel.instance) {
      ConvocatoriaModel.instance = new ConvocatoriaModel();
    }
    return ConvocatoriaModel.instance;
  }

  getConvocatorias = async () => {
    const { rows } = await pool.query(q.getConvocatorias);
    return rows;
  };

  insertConvocatoria = async (nombre, mercado, fechaAudiencia) => {
    const { rows } = await pool.query(q.insertConvocatoria, [nombre, mercado, fechaAudiencia]);
    return rows[0];
  };

  // ─── Contratos ────────────────────────────────────────────────────────────

  getContratosByConvocatoria = async (convocatoriaId) => {
    const { rows } = await pool.query(q.getContratosByConvocatoria, [convocatoriaId]);
    return rows;
  };

  insertContrato = async (convocatoriaId, descripcion, fechaInicio, fechaFin) => {
    const { rows } = await pool.query(q.insertContrato, [
      convocatoriaId,
      descripcion ?? null,
      fechaInicio,
      fechaFin,
    ]);
    return rows[0];
  };

  getContratoByCodigo = async (codigo) => {
    const { rows } = await pool.query(q.getContratoByCodigo, [codigo]);
    return rows[0] || null;
  };

  getContratoActivoByCodigo = async (codigo) => {
    const { rows } = await pool.query(q.getContratoActivoByCodigo, [codigo]);
    return rows[0] || null;
  };

  getAgenteByCodigo = async (codigo) => {
    const { rows } = await pool.query(q.getAgenteByCodigo, [codigo]);
    return rows[0] || null;
  };

  updateAgente = async (codigo, setObj) => {
    const cols = Object.keys(setObj);
    if (!cols.length) return this.getContratoActivoByCodigo(codigo);
    const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const values = cols.map((c) => setObj[c]);
    values.push(codigo);
    const sql = `
      UPDATE "SphaerAI_contrato_convocatoria"
      SET ${setClause}
      WHERE codigo = $${values.length} AND estado = 1
      RETURNING codigo, convocatoria_id, descripcion, fecha_inicio, fecha_fin, fecha_creacion,
                sic, agente, razon_s, nit, direccion, ciudad, telefono, codigo_tercero, estado
    `;
    const { rows } = await pool.query(sql, values);
    return rows[0] || null;
  };

  // ─── Archivos (dinámico por tabla de la lista blanca) ───────────────────────

  insertArchivo = async (tabla, valuesObj) => {
    assertTabla(tabla);
    const cols = Object.keys(valuesObj);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const values = cols.map((c) => valuesObj[c]);
    const sql = `
      INSERT INTO "${tabla}" (${cols.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;
    const { rows } = await pool.query(sql, values);
    return rows[0];
  };

  getArchivoById = async (tabla, id) => {
    assertTabla(tabla);
    const { rows } = await pool.query(`SELECT * FROM "${tabla}" WHERE id = $1`, [id]);
    return rows[0] || null;
  };

  getArchivosByContrato = async (tabla, contratoCodigo) => {
    assertTabla(tabla);
    const { rows } = await pool.query(
      `SELECT * FROM "${tabla}" WHERE contrato_codigo = $1 ORDER BY fecha_carga`,
      [contratoCodigo]
    );
    return rows;
  };

  updateArchivo = async (tabla, id, setObj) => {
    assertTabla(tabla);
    const cols = Object.keys(setObj);
    if (!cols.length) return this.getArchivoById(tabla, id);
    const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const values = cols.map((c) => setObj[c]);
    values.push(id);
    const sql = `
      UPDATE "${tabla}"
      SET ${setClause}
      WHERE id = $${values.length}
      RETURNING *
    `;
    const { rows } = await pool.query(sql, values);
    return rows[0] || null;
  };
}