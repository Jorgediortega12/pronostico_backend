import * as querys from "../querys/circuitos.query.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

export default class CircuitosModel {
  static instance;

  static getInstance() {
    if (!CircuitosModel.instance) {
      CircuitosModel.instance = new CircuitosModel();
    }
    return CircuitosModel.instance;
  }

  crearCircuito = async ({ ucp, circuito, codigo_rpm }, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.crearCircuito, [
        ucp,
        circuito ?? null,
        codigo_rpm ?? null,
      ]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(colors.red("Error CircuitosModel crearCircuito"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  obtenerCircuitos = async (client) => {
    try {
      await client.connect();
      const result = await client.query(querys.obtenerCircuitos);
      return result.rows;
    } catch (error) {
      Logger.error(colors.red("Error CircuitosModel obtenerCircuitos"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  obtenerCircuitosPorUCP = async ({ ucp }, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.obtenerCircuitosPorUCP, [ucp]);
      return result.rows;
    } catch (error) {
      Logger.error(
        colors.red("Error CircuitosModel obtenerCircuitosPorUCP"),
        error,
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  actualizarCircuito = async ({ id, ucp, circuito, codigo_rpm }, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.actualizarCircuito, [
        ucp,
        circuito ?? null,
        codigo_rpm ?? null,
        id,
      ]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(
        colors.red("Error CircuitosModel actualizarCircuito"),
        error,
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  eliminarCircuito = async ({ id }, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.eliminarCircuito, [id]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(colors.red("Error CircuitosModel eliminarCircuito"), error);
      throw error;
    } finally {
      await client.end();
    }
  };
}
