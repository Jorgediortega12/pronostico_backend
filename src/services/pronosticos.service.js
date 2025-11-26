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
   * Guarda sesión (versionada) y agrega datos pronóstico + histórico.
   *
   * @param {Object} params
   * @param {Pool} params.pool - pool pg
   * @param {Object} params.model - tu model con buscarVersionSesion, agregarVersionSesion, agregarDatosPronosticoxSesion
   * @param {string} params.ucp
   * @param {string} params.fecha_inicio - 'YYYY-MM-DD' u otros formatos compatibles
   * @param {string} params.fecha_fin
   * @param {string} params.usuario - quien exporta
   * @param {Array} params.pronosticoList - [{ fecha, p1..p24, observacion? }, ...]
   * @param {Array} params.historicoList - [{ fecha, p1..p24, observacion? }, ...]
   * @param {Object} [params.datos] - opcional, objeto con cuadroperiodo1..cuadroperiodo24 y otros flags (tipodatos,tipoedicion,...)
   * @param {string} [params.nombreArchivoTxt] - nombre del txt (ej 'MCAtlanticoAGTE1905.txt') (opcional, si no se pasa se construye)
   */
  saveSessionAndData = async ({
    model,
    ucp,
    fecha_inicio,
    fecha_fin,
    usuario,
    pronosticoList = [],
    historicoList = [],
    datos = {},
    nombreArchivoTxt = null,
  }) => {
    // helpers
    const parseMoment = (f) =>
      moment(
        f,
        ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
        true
      ).isValid()
        ? moment(
            f,
            ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
            true
          )
        : moment(f);

    const convertFechaAño = (f) => {
      const m = parseMoment(f);
      return m && m.isValid() ? m.format("YYYYMMDD") : null;
    };

    // Determinar stopDate y startDate
    const ordered = Array.isArray(pronosticoList)
      ? [...pronosticoList].sort((a, b) => {
          const ma = parseMoment(a.fecha);
          const mb = parseMoment(b.fecha);
          return ma && mb ? ma.valueOf() - mb.valueOf() : 0;
        })
      : [];

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
    const stopDate = reportMoment;
    const startDate =
      parseMoment(fecha_inicio) && parseMoment(fecha_inicio).isValid()
        ? parseMoment(fecha_inicio)
        : moment();

    // nombresesion y nombrearchivo
    const dd = stopDate.format("DD");
    const mmStart = startDate.format("MM");
    const nombresesion = `MC${ucp}AGTE${dd}${mmStart}`;
    const nombrearchivo = nombreArchivoTxt || `MC${ucp}AGTE${dd}${mmStart}.txt`;

    // cuadroperiodo1..24: tomar de datos si vienen, sino "0"
    const cuadro = {};
    for (let i = 1; i <= 24; i++) {
      const key = `cuadroperiodo${i}`;
      cuadro[key] =
        datos &&
        typeof datos[key] !== "undefined" &&
        datos[key] !== null &&
        datos[key] !== ""
          ? String(datos[key])
          : "0";
    }

    // Meta campos (mapeo a lo que espera agregarVersionSesion)
    const meta = {
      tipodatos: datos.tipodatos ?? "",
      tendencia: datos.tipoedicion ?? "", // en tu model es 'tendencia'
      dias: datos.ediciontipodia ?? "", // 'dias'
      edicionfiltro: datos.edicionmanual ?? "", // 'edicionfiltro'
      edicionperiodo: datos.edicionultimo ?? "", // 'edicionperiodo'
      ediciontexto: "", // vacío como en tu C#
      edicionfecha: datos.ediciondiareferencia ?? "",
      edicionsuma: datos.cuadropdias ?? "",
      cargaindustrial: datos.cargaindustrial ?? "",
    };

    // 1) buscar versión existente
    const versionRow = await model.buscarVersionSesion(nombresesion);
    // versionRow puede venir como objeto { version: x } o { rows: [...] } o array
    let nroversion = 1;
    if (versionRow) {
      const v =
        versionRow.version ??
        (versionRow.rows && versionRow.rows[0] && versionRow.rows[0].version) ??
        (Array.isArray(versionRow) && versionRow[0] && versionRow[0].version);
      if (v) nroversion = 1 + parseInt(v, 10);
    }

    // 2) preparar objeto para agregarVersionSesion (firma que mostró tu model)
    const versionData = {
      fecha: moment().format("YYYY-MM-DD HH:mm:ss"), // tu model espera datos.fecha
      ucp,
      fechainicio: convertFechaAño(fecha_inicio),
      fechafin: convertFechaAño(fecha_fin),
      tipodatos: meta.tipodatos,
      tendencia: meta.tendencia,
      dias: meta.dias,
      edicionfiltro: meta.edicionfiltro,
      edicionperiodo: meta.edicionperiodo,
      ediciontexto: meta.ediciontexto,
      edicionfecha: meta.edicionfecha,
      edicionsuma: meta.edicionsuma,
      nombre: nombresesion,
      version: String(nroversion),
      usuario,
      p1_diario: cuadro.cuadroperiodo1,
      p2_diario: cuadro.cuadroperiodo2,
      p3_diario: cuadro.cuadroperiodo3,
      p4_diario: cuadro.cuadroperiodo4,
      p5_diario: cuadro.cuadroperiodo5,
      p6_diario: cuadro.cuadroperiodo6,
      p7_diario: cuadro.cuadroperiodo7,
      p8_diario: cuadro.cuadroperiodo8,
      p9_diario: cuadro.cuadroperiodo9,
      p10_diario: cuadro.cuadroperiodo10,
      p11_diario: cuadro.cuadroperiodo11,
      p12_diario: cuadro.cuadroperiodo12,
      p13_diario: cuadro.cuadroperiodo13,
      p14_diario: cuadro.cuadroperiodo14,
      p15_diario: cuadro.cuadroperiodo15,
      p16_diario: cuadro.cuadroperiodo16,
      p17_diario: cuadro.cuadroperiodo17,
      p18_diario: cuadro.cuadroperiodo18,
      p19_diario: cuadro.cuadroperiodo19,
      p20_diario: cuadro.cuadroperiodo20,
      p21_diario: cuadro.cuadroperiodo21,
      p22_diario: cuadro.cuadroperiodo22,
      p23_diario: cuadro.cuadroperiodo23,
      p24_diario: cuadro.cuadroperiodo24,
      nombrearchivo,
      cargaindustrial: meta.cargaindustrial,
    };

    // Llamar a tu model.agregarVersionSesion pasando el objeto (tu model lo transforma a valores)
    const versionInserted = await model.agregarVersionSesion(versionData);
    if (!versionInserted) throw new Error("No se pudo crear versión de sesión");

    // extraer codigo de la respuesta (tu model retorna result.rows[0])
    const codsesion =
      versionInserted.codigo ??
      (versionInserted.rows &&
        versionInserted.rows[0] &&
        versionInserted.rows[0].codigo) ??
      (Array.isArray(versionInserted) &&
        versionInserted[0] &&
        versionInserted[0].codigo);
    if (!codsesion) {
      throw new Error(
        "No se obtuvo codigo de sesión desde agregarVersionSesion"
      );
    }

    // 3) Insertar Pronóstico usando model.agregarDatosPronosticoxSesion(datos)
    for (const rec of pronosticoList) {
      const fechaConv = convertFechaAño(rec.fecha);
      // construir objeto con p1..p24 y demás campos que espera tu model
      const datosDia = {
        codsesion: String(codsesion),
        check_f: "0",
        fecha: fechaConv,
        p1: String(rec.p1 ?? "0").replace(",", "."),
        p2: String(rec.p2 ?? "0").replace(",", "."),
        p3: String(rec.p3 ?? "0").replace(",", "."),
        p4: String(rec.p4 ?? "0").replace(",", "."),
        p5: String(rec.p5 ?? "0").replace(",", "."),
        p6: String(rec.p6 ?? "0").replace(",", "."),
        p7: String(rec.p7 ?? "0").replace(",", "."),
        p8: String(rec.p8 ?? "0").replace(",", "."),
        p9: String(rec.p9 ?? "0").replace(",", "."),
        p10: String(rec.p10 ?? "0").replace(",", "."),
        p11: String(rec.p11 ?? "0").replace(",", "."),
        p12: String(rec.p12 ?? "0").replace(",", "."),
        p13: String(rec.p13 ?? "0").replace(",", "."),
        p14: String(rec.p14 ?? "0").replace(",", "."),
        p15: String(rec.p15 ?? "0").replace(",", "."),
        p16: String(rec.p16 ?? "0").replace(",", "."),
        p17: String(rec.p17 ?? "0").replace(",", "."),
        p18: String(rec.p18 ?? "0").replace(",", "."),
        p19: String(rec.p19 ?? "0").replace(",", "."),
        p20: String(rec.p20 ?? "0").replace(",", "."),
        p21: String(rec.p21 ?? "0").replace(",", "."),
        p22: String(rec.p22 ?? "0").replace(",", "."),
        p23: String(rec.p23 ?? "0").replace(",", "."),
        p24: String(rec.p24 ?? "0").replace(",", "."),
        observacion: rec.observacion ?? "",
        tipo: "P",
      };

      await model.agregarDatosPronosticoxSesion(datosDia);
    }

    // 4) Insertar Histórico (tipo "D")
    for (const rec of historicoList) {
      const fechaConv = convertFechaAño(rec.fecha);
      const datosDia = {
        codsesion: String(codsesion),
        check_f: "0",
        fecha: fechaConv,
        p1: String(rec.p1 ?? "0").replace(",", "."),
        p2: String(rec.p2 ?? "0").replace(",", "."),
        p3: String(rec.p3 ?? "0").replace(",", "."),
        p4: String(rec.p4 ?? "0").replace(",", "."),
        p5: String(rec.p5 ?? "0").replace(",", "."),
        p6: String(rec.p6 ?? "0").replace(",", "."),
        p7: String(rec.p7 ?? "0").replace(",", "."),
        p8: String(rec.p8 ?? "0").replace(",", "."),
        p9: String(rec.p9 ?? "0").replace(",", "."),
        p10: String(rec.p10 ?? "0").replace(",", "."),
        p11: String(rec.p11 ?? "0").replace(",", "."),
        p12: String(rec.p12 ?? "0").replace(",", "."),
        p13: String(rec.p13 ?? "0").replace(",", "."),
        p14: String(rec.p14 ?? "0").replace(",", "."),
        p15: String(rec.p15 ?? "0").replace(",", "."),
        p16: String(rec.p16 ?? "0").replace(",", "."),
        p17: String(rec.p17 ?? "0").replace(",", "."),
        p18: String(rec.p18 ?? "0").replace(",", "."),
        p19: String(rec.p19 ?? "0").replace(",", "."),
        p20: String(rec.p20 ?? "0").replace(",", "."),
        p21: String(rec.p21 ?? "0").replace(",", "."),
        p22: String(rec.p22 ?? "0").replace(",", "."),
        p23: String(rec.p23 ?? "0").replace(",", "."),
        p24: String(rec.p24 ?? "0").replace(",", "."),
        observacion: rec.observacion ?? "",
        tipo: "D",
      };

      await model.agregarDatosPronosticoxSesion(datosDia);
    }

    return {
      success: true,
      codsesion,
      nombresesion,
      nombrearchivo,
    };
  };

  /**
   * Inserta en BD y genera archivos .txt/.xlsx (opcionalmente registra archivo en BD)
   * @param {string} fecha_inicio - fecha inicio del pronostico
   * @param {string} fecha_fin - fecha fin del pronostico
   * @param {string} usuario - usuario que exporto
   * @param {string} ucp - ucp/mc (mercado comercializacion, se usa como carpeta MC{ucp})
   * @param {Array} pronosticoList - array [{fecha, p1..p24, observacion?}, ...]
   * @param {Array} historicoList - array [{fecha, p1..p24, observacion?}, ...]
   */
  // Asegúrate de importar/definir al inicio del archivo:
  // import { generateTxtToFolder, generateXlsxToFolder, saveSessionAndData } from './utils/reportGenerator';
  // const sessionModel = configuracionModelSesion; // <-- ajusta al model real

  exportarBulk = async (
    fecha_inicio,
    fecha_fin,
    usuario,
    ucp,
    pronosticoList,
    historicoList,
    datos = {} // <-- opcional: pasa aquí los cuadroperiodoX y metadatos si vienen
  ) => {
    try {
      // 1) Generar archivos
      const normalizeDate = (f) => {
        if (!f) return new Date(0);
        return new Date(f);
      };

      const ordered = Array.isArray(pronosticoList)
        ? [...pronosticoList].sort(
            (a, b) => normalizeDate(a.fecha) - normalizeDate(b.fecha)
          )
        : [];

      // 2) Determinar fecha de reporte: ultima fecha - 6 dias
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

      const fileBaseName = `MC${ucp}AGTE${dd}${mm}`;

      // 3) Obtener/crear carpeta en BD y carpeta física
      const reportDirPhysicalRoot =
        process.env.REPORT_DIR || path.join(process.cwd(), "reportes");
      const monthName = monthNameSpanish(Number(mm));
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

      // 4) Generar archivos directamente en folderPathPhysical
      if (
        typeof generateTxtToFolder !== "function" ||
        typeof generateXlsxToFolder !== "function"
      ) {
        throw new Error(
          "Faltan las funciones generateTxtToFolder/generateXlsxToFolder"
        );
      }

      const txtResult = await generateTxtToFolder({
        pronosticoList: ordered,
        ucp,
        fecha_inicio,
        fecha_fin,
        folderPhysical: folderPathPhysical,
        fileBaseName,
        configuracionModel,
      });

      const xlsxResult = await generateXlsxToFolder({
        pronosticoList: ordered,
        ucp,
        fecha_inicio,
        fecha_fin,
        folderPhysical: folderPathPhysical,
        fileBaseName,
        configuracionModel,
      });

      const rutaBD_xlsx = `${folderPathLogical}/${xlsxResult.xlsxName}`;
      const rutaBD_txt = `${folderPathLogical}/${txtResult.txtName}`;

      // 5) Insertar ambos archivos en una transacción y devolver los ids
      let insertIds = { xlsxId: null, txtId: null };
      const clientFiles = await pool.connect();
      try {
        await clientFiles.query("BEGIN");

        const resXlsx = await insertFileRecord(clientFiles, {
          nombreArchivo: xlsxResult.xlsxName,
          rutaArchivo: rutaBD_xlsx,
          codcarpeta: codcarpeta,
          contentType: null,
        });
        insertIds.xlsxId = resXlsx ? resXlsx.codigo : null;

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
        // continuar (igual que tu C#) o throw si prefieres abortar
      } finally {
        clientFiles.release();
      }

      // 6) Guardar sesión y datos (pronóstico + histórico)
      if (typeof this.saveSessionAndData !== "function") {
        Logger.warn(
          "saveSessionAndData no definido - se omite guardado de sesión"
        );
      } else {
        try {
          // sessionModel debe ser el model que implementa buscarVersionSesion/agregarVersionSesion/agregarDatosPronosticoxSesion
          const sessionResult = await this.saveSessionAndData({
            model: configuracionModel,
            ucp,
            fecha_inicio,
            fecha_fin,
            usuario,
            pronosticoList: ordered,
            historicoList,
            datos, // objeto con cuadroperiodo1..24 y demas flags
            nombreArchivoTxt: txtResult.txtName,
          });
          Logger.info(
            `Sesión guardada: ${sessionResult.nombresesion} id=${sessionResult.codsesion}`
          );
        } catch (err) {
          Logger.error("Error guardando sesión y datos:", err);
          // Por ahora no abortamos la exportación por fallo en sesión (consistente con tu C#).
        }
      }

      // 7) Respuesta
      return {
        success: true,
        message: `Se insertaron ${
          /* si tuvieras insertResult original, podrías usarlo; fallback: */ pronosticoList.length
        } pronósticos. Archivos generados: ${txtResult.txtName}, ${
          xlsxResult.xlsxName
        }`,
        files: { txt: txtResult, xlsx: xlsxResult, insertIds },
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
