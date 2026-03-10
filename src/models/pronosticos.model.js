// models/pronosticos.model.js
import * as querys from "../querys/pronosticos.query.js";
import pkg from "pg";
const { Client } = pkg;
import Logger from "../helpers/logger.js";
import colors from "colors";
import dotenv from "dotenv";
dotenv.config();

export default class PronosticosModel {
  static instance;
  static getInstance() {
    if (!PronosticosModel.instance) {
      PronosticosModel.instance = new PronosticosModel();
    }
    return PronosticosModel.instance;
  }
  // Borrar por UCP + opcional rango de fecha (si pasas finicio/ffin)
  borrarPronosticosPorUCPyRango = async (
    ucp,
    finicio = null,
    ffin = null,
    client,
  ) => {
    try {
      await client.connect();
      if (finicio && ffin) {
        await client.query(
          "DELETE FROM pronosticos WHERE ucp = $1 AND fecha BETWEEN $2::date AND $3::date",
          [ucp, finicio, ffin],
        );
      } else {
        await client.query("DELETE FROM pronosticos WHERE ucp = $1", [ucp]);
      }
      await client.end();
      return { success: true };
    } catch (error) {
      try {
        await client.end();
      } catch (e) {}
      Logger.error(
        colors.red("Error PronosticosModel borrarPronosticosPorUCPyRango "),
        error,
      );
      throw error;
    }
  };
}
