import * as querys from "../querys/factores.querys.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

export default class FactoresModel {
  static instance;

  static getInstance() {
    if (!FactoresModel.instance) {
      FactoresModel.instance = new FactoresModel();
    }
    return FactoresModel.instance;
  }

  createClient() {
    return new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST || "localhost",
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: process.env.POSTGRES_PORT || 5432,
    });
  }

  guardarBarra = async (data) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.guardarBarra, [
        data.barra,
        data.descripcion,
        data.nivel_tension,
        data.observaciones,
        data.habilitar,
        data.mc,
      ]);
      return result.rows[0];
    } catch (error) {
      Logger.error(colors.red("Error FactoresModel guardarBarra"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  consultarBarrasIndex_xMC = async (mc) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.consultarBarrasIndex_xMC, [mc]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error FactoresModel consultarBarrasIndex_xMC"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  actualizarBarra = async (id, data) => {
    const client = this.createClient();
    try {
      await client.connect();
      await client.query(querys.actualizarBarra, [
        data.barra,
        data.descripcion,
        data.nivel_tension,
        data.observaciones,
        data.habilitar,
        data.mc,
        id,
      ]);
      return true;
    } catch (error) {
      Logger.error(colors.red("Error FactoresModel actualizarBarra"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  guardarAgrupacion = async (data) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.guardarAgrupacion, [
        data.barra_id,
        data.codigo_rpm,
        data.flujo,
        data.habilitar,
        data.revision,
        data.factor,
      ]);
      return result.rows[0];
    } finally {
      await client.end();
    }
  };

  consultarAgrupacionesIndex_xBarraId = async (barra_id) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(
        querys.consultarAgrupacionesIndex_xBarraId,
        [barra_id]
      );
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error FactoresModel consultarAgrupacionesIndex_xBarraId"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  actualizarAgrupacion = async (id, data) => {
    const client = this.createClient();
    try {
      await client.connect();
      await client.query(querys.actualizarAgrupacion, [
        data.barra_id,
        data.codigo_rpm,
        data.flujo,
        data.habilitar,
        data.revision,
        data.factor,
        id,
      ]);
      return true;
    } finally {
      await client.end();
    }
  };

  eliminarBarraConAgrupaciones = async (id) => {
    const client = this.createClient();
    try {
      await client.connect();
      await client.query("BEGIN");

      // 1️⃣ Eliminar agrupaciones hijas
      await client.query(querys.eliminarAgrupacionesPorBarra, [id]);

      // 2️⃣ Eliminar barra
      await client.query(querys.eliminarBarra, [id]);

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
  };

  eliminarAgrupacion = async (id) => {
    const client = this.createClient();
    try {
      await client.connect();
      await client.query(querys.eliminarAgrupacion, [id]);
      return true;
    } finally {
      await client.end();
    }
  };
}
