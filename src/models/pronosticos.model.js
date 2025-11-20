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

  createClient() {
    return new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST || "localhost",
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: process.env.POSTGRES_PORT || 5432,
    });
  }

  // Insert único (tu ejemplo adaptado)
  crearPronostico = async (
    ucp,
    fecha,
    codigo = null,
    observacion = null,
    usuario = null,
    pArray = []
  ) => {
    const client = this.createClient();
    try {
      await client.connect();
      // Construir arreglo de p1..p24 desde pArray (si viene) o rellenar con ceros
      const ps = new Array(24).fill(0);
      if (Array.isArray(pArray) && pArray.length >= 1) {
        // si pArray tiene 24 números -> usarlos; si tiene arrays -> sumar cada periodo
        if (pArray.length === 24 && typeof pArray[0] === "number") {
          for (let i = 0; i < 24; i++) ps[i] = Number(pArray[i] || 0);
        } else if (pArray.length === 24 && Array.isArray(pArray[0])) {
          for (let i = 0; i < 24; i++)
            ps[i] = pArray[i].reduce((s, v) => s + Number(v || 0), 0);
        }
      }
      const values = [ucp, fecha, codigo, observacion, usuario, ...ps];
      const result = await client.query(querys.crearPronostico, values);
      await client.end();
      return result;
    } catch (error) {
      Logger.error(
        colors.red("Error PronosticosModel crearPronostico "),
        error
      );
      try {
        await client.end();
      } catch (e) {}
      throw error;
    }
  };

  // Bulk insert: recibe array de objetos con las columnas necesarias
  crearPronosticosBulk = async (
    ucpGlobal,
    pronosticoList = [],
    borrarPrevio = false
  ) => {
    const client = this.createClient();
    console.log("CLIENT:", client);
    try {
      await client.connect();
      await client.query("BEGIN");

      if (borrarPrevio) {
        // borra pronosticos del ucpGlobal dentro del rango de fechas que se envíe
        // Para ser conservador sólo borramos por ucp si borrarPrevio=true
        await client.query("DELETE FROM pronosticos WHERE ucp = $1", [
          ucpGlobal,
        ]);
      }

      // Preparar insert parametrizado por cada registro
      for (let rec of pronosticoList) {
        // rec esperado: { fecha, p1..p24, codigo?, observacion? }
        const fecha = rec.fecha;
        // const codigo = rec.codigo || null;
        const observacion = rec.observacion || null;
        const ps = [];
        for (let i = 1; i <= 24; i++) {
          const key = `p${i}`;
          let val = 0;
          if (rec[key] != null)
            val = Number(String(rec[key]).replace(",", ".")) || 0;
          ps.push(val);
        }
        // const values = [ucpGlobal, fecha, codigo, observacion, ...ps];
        const values = [ucpGlobal, fecha, observacion, ...ps];
        // Reusar la query single (tiene 29 parámetros)
        await client.query(querys.crearPronostico, values);
      }

      await client.query("COMMIT");
      await client.end();
      return { rowCount: pronosticoList.length, success: true };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (e) {}
      try {
        await client.end();
      } catch (e) {}
      Logger.error(
        colors.red("Error PronosticosModel crearPronosticosBulk "),
        error
      );
      throw error;
    }
  };

  // Borrar por UCP + opcional rango de fecha (si pasas finicio/ffin)
  borrarPronosticosPorUCPyRango = async (ucp, finicio = null, ffin = null) => {
    const client = this.createClient();
    try {
      await client.connect();
      if (finicio && ffin) {
        await client.query(
          "DELETE FROM pronosticos WHERE ucp = $1 AND fecha BETWEEN $2::date AND $3::date",
          [ucp, finicio, ffin]
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
        error
      );
      throw error;
    }
  };
}
