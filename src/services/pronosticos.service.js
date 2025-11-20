// services/pronosticos.service.js
import PronosticosModel from "../models/pronosticos.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import {
  generateAndSaveReports,
  insertFileRecord,
} from "../utils/reportGenerator.js";
import { Pool } from "pg";
import path from "path";

const model = PronosticosModel.getInstance();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default class PronosticosService {
  static instance;
  static getInstance() {
    if (!PronosticosService.instance) {
      PronosticosService.instance = new PronosticosService();
    }
    return PronosticosService.instance;
  }

  crearPronostico = async (
    ucp,
    fecha,
    codigo,
    observacion,
    usuario = null,
    pArray = []
  ) => {
    try {
      const result = await model.crearPronostico(
        ucp,
        fecha,
        codigo,
        observacion,
        usuario,
        pArray
      );
      if (!result || result.rowCount === 0)
        return { success: false, message: "No se pudo crear el pronóstico." };
      return { success: true, message: "Pronóstico creado correctamente." };
    } catch (err) {
      Logger.error(
        colors.red("Error PronosticosService crearPronostico "),
        err
      );
      throw new Error("ERROR TECNICO");
    }
  };

  /**
   * Inserta en BD y genera archivos .txt/.xlsx (opcionalmente registra archivo en BD)
   * @param {string} ucp - identificador (se usa como carpeta MC{ucp})
   * @param {Array} pronosticoList - array [{fecha, p1..p24, codigo?, observacion?}, ...]
   * @param {boolean} borrarPrevio
   * @param {boolean} generarArchivos - si false, no generará txt/xlsx
   */
  crearPronosticosBulk = async (
    ucp,
    pronosticoList,
    borrarPrevio = false,
    generarArchivos = true,
    codcarpeta = null // <-- si quieres asignar carpeta desde el controller
  ) => {
    try {
      // 1) Insertar en BD (modelo)
      const insertResult = await model.crearPronosticosBulk(
        ucp,
        pronosticoList,
        borrarPrevio
      );

      if (!insertResult || !insertResult.success) {
        return {
          success: false,
          message: "No se pudieron insertar pronósticos.",
        };
      }

      // 2) Generar archivos (si se solicita)
      if (generarArchivos) {
        try {
          // Normalizar/ordenar pronosticoList por fecha ascendente
          const normalizeDate = (f) => {
            if (!f) return new Date(0);
            return new Date(f);
          };

          const ordered = Array.isArray(pronosticoList)
            ? [...pronosticoList].sort(
                (a, b) => normalizeDate(a.fecha) - normalizeDate(b.fecha)
              )
            : [];

          // baseDir para reportes (usa REPORT_DIR si está en .env)
          const baseDir =
            process.env.REPORT_DIR || path.join(process.cwd(), "reportes");

          // Usamos ucp como nombre de carpeta MC{ucp}
          const mcForFolder = ucp;

          // generar archivos TXT y XLSX
          const { txtPath, xlsxPath, txtName, xlsxName } =
            await generateAndSaveReports(ordered, mcForFolder, baseDir, {
              truncate: true,
              keepDecimals: false,
            });

          // 3) Registrar archivo XLSX en tabla 'archivos'
          try {
            const client = await pool.connect();

            await insertFileRecord(client, {
              nombreArchivo: xlsxName, // ejemplo: MC001_PRONOSTICO_20251119.xlsx
              rutaArchivo: xlsxPath, // ruta absoluta del archivo generado
              codcarpeta: codcarpeta, // si no tienes una carpeta, pasas null
              contentType: null, // deja que se infiera automáticamente
            });

            client.release();
          } catch (regErr) {
            Logger.error(
              colors.red("Warning: no se pudo registrar archivo en BD: "),
              regErr.message || regErr
            );
          }

          return {
            success: true,
            message: `Se insertaron ${
              insertResult.rowCount || pronosticoList.length
            } pronósticos. Archivos generados: ${txtName}, ${xlsxName}`,
          };
        } catch (fileErr) {
          Logger.error(
            colors.red("Error generando archivos pronosticos: "),
            fileErr
          );

          return {
            success: true,
            message: `Se insertaron pronósticos (error al generar archivos: ${fileErr.message})`,
          };
        }
      }

      // Si no generamos archivos
      return {
        success: true,
        message: `Se insertaron ${
          insertResult.rowCount || pronosticoList.length
        } pronósticos.`,
      };
    } catch (err) {
      Logger.error(
        colors.red("Error PronosticosService crearPronosticosBulk "),
        err
      );
      throw new Error("ERROR TECNICO");
    }
  };

  borrarPronosticos = async (ucp, finicio = null, ffin = null) => {
    try {
      const result = await model.borrarPronosticosPorUCPyRango(
        ucp,
        finicio,
        ffin
      );
      return { success: true, message: "Pronósticos borrados." };
    } catch (err) {
      Logger.error(
        colors.red("Error PronosticosService borrarPronosticos "),
        err
      );
      throw new Error("ERROR TECNICO");
    }
  };
}
