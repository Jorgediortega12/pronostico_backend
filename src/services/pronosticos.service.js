// services/pronosticos.service.js
import PronosticosModel from "../models/pronosticos.model.js";
import ConfiguracionModel from "../models/configuracion.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import {
  generateTxtToFolder,
  generateXlsxToFolder,
  insertFileRecord,
} from "../utils/reportGenerator.js";
import {
  getOrCreatePronosticosMonthFolder,
  monthNameSpanish,
} from "../utils/folders.js";
import { Pool } from "pg";
import path from "path";
import moment from "moment";

const model = PronosticosModel.getInstance();
const configuracionModel = ConfiguracionModel.getInstance();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default class PronosticosService {
  static instance;
  static getInstance() {
    if (!PronosticosService.instance) {
      PronosticosService.instance = new PronosticosService();
    }
    return PronosticosService.instance;
  }

  /**
   * Inserta en BD y genera archivos .txt/.xlsx (opcionalmente registra archivo en BD)
   * @param {string} fecha_inicio - fecha inicio del pronostico
   * @param {string} fecha_fin - fecha fin del pronostico
   * @param {string} usuario - usuario que exporto
   * @param {string} ucp - ucp/mc (mercado comercializacion, se usa como carpeta MC{ucp})
   * @param {Array} pronosticoList - array [{fecha, p1..p24, observacion?}, ...]
   * @param {Array} historicoList - array [{fecha, p1..p24, observacion?}, ...]
   */
  exportarBulk = async (
    fecha_inicio,
    fecha_fin,
    usuario,
    ucp,
    pronosticoList,
    historicoList
  ) => {
    try {
      // 1) Insertar en BD (modelo)
      const insertResult = await model.exportarBulk(ucp, pronosticoList);

      if (!insertResult || !insertResult.success) {
        return {
          success: false,
          message: "No se pudieron insertar pronósticos.",
        };
      }

      // 2) Generar archivos
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

      // 3) Determinar fecha de reporte: ultima fecha - 6 dias
      const lastDateStr =
        ordered.length > 0 ? ordered[ordered.length - 1].fecha : null;
      const mLast = moment(
        lastDateStr,
        ["DD/MM/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"],
        true
      );
      const reportMoment = mLast.isValid()
        ? mLast.clone().subtract(6, "days")
        : moment().subtract(6, "days");
      const dd = reportMoment.format("DD");
      const mm = reportMoment.format("MM");
      const yyyy = reportMoment.format("YYYY");

      // si quieres mantener el prefijo "MC" pero con la UCP capitalizada:
      const fileBaseName = `MC${ucp}AGTE${dd}${mm}`;

      // 4) Obtener/crear carpeta en BD y carpeta física
      const reportDirPhysicalRoot =
        process.env.REPORT_DIR || path.join(process.cwd(), "reportes");
      const monthName = monthNameSpanish(Number(mm)); // 'Noviembre'
      const client = await pool.connect();
      let codcarpeta = null;
      let folderPathLogical = null;
      let folderPathPhysical = null;
      try {
        const folderInfo = await getOrCreatePronosticosMonthFolder(
          client,
          ucp,
          yyyy,
          monthName,
          reportDirPhysicalRoot
        );
        codcarpeta = folderInfo.codcarpeta;
        folderPathLogical = folderInfo.folderPathLogical;
        folderPathPhysical = folderInfo.folderPathPhysical;
      } finally {
        client.release();
      }

      // 5) Generar archivos directamente en folderPathPhysical

      // generar TXT
      const txtResult = await generateTxtToFolder({
        pronosticoList: ordered,
        ucp,
        fecha_inicio,
        fecha_fin,
        folderPhysical: folderPathPhysical,
        fileBaseName,
        configuracionModel,
      });

      // generar XLSX
      const xlsxResult = await generateXlsxToFolder({
        pronosticoList: ordered,
        ucp,
        fecha_inicio,
        fecha_fin,
        folderPhysical: folderPathPhysical,
        fileBaseName,
        configuracionModel,
      });

      // ruta lógica que guardaremos en BD (con ~)
      const rutaBD_xlsx = `${folderPathLogical}/${xlsxResult.xlsxName}`; // e.g. '~/Reportes/Pronosticos/Atlantico/2025/Mayo/MCAtlanticoAGTE1905.xlsx'
      const rutaBD_txt = `${folderPathLogical}/${txtResult.txtName}`;

      // Insertar ambos archivos en una transacción y devolver los ids
      let insertIds = { xlsxId: null, txtId: null };
      const clientFiles = await pool.connect();
      try {
        await clientFiles.query("BEGIN");

        // insertar XLSX
        const resXlsx = await insertFileRecord(clientFiles, {
          nombreArchivo: xlsxResult.xlsxName,
          rutaArchivo: rutaBD_xlsx,
          codcarpeta: codcarpeta,
          contentType: null, // se infiere en insertFileRecord si es null
        });
        // resXlsx debe contener { codigo: <id> } si insertFileRecord lo retorna
        insertIds.xlsxId = resXlsx ? resXlsx.codigo : null;

        // insertar TXT
        const resTxt = await insertFileRecord(clientFiles, {
          nombreArchivo: txtResult.txtName,
          rutaArchivo: rutaBD_txt,
          codcarpeta: codcarpeta,
          contentType: null,
        });
        insertIds.txtId = resTxt ? resTxt.codigo : null;

        await clientFiles.query("COMMIT");
      } catch (errInsert) {
        await clientFiles.query("ROLLBACK");
        Logger.error(
          colors.red("Error insertando registros en archivos:"),
          errInsert
        );
        // no throw; depende de si quieres abortar todo o continuar. Aquí logueamos y continuamos.
      } finally {
        clientFiles.release();
      }

      return {
        success: true,
        message: `Se insertaron ${
          insertResult.rowCount || pronosticoList.length
        } pronósticos. Archivos generados: ${txtResult.txtName}, ${
          xlsxResult.xlsxName
        }`,
      };
    } catch (err) {
      Logger.error(colors.red("Error PronosticosService exportarBulk "), err);
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
