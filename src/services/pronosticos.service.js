// services/pronosticos.service.js
import PronosticosModel from "../models/pronosticos.model.js";
import ConfiguracionModel from "../models/configuracion.model.js";
import SesionModel from "../models/sesion.model.js";
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
const sesionModel = SesionModel.getInstance();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// helpers de fecha (robustos a entradas vacías y varios formatos básicos)
function toISODateString(input) {
  if (!input && input !== 0) return "";

  // si ya viene en formato YYYY-MM-DD (solo fecha)
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input))
    return input;

  // si viene con hora ISO (YYYY-MM-DDTHH:mm:ss)
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}T/.test(input))
    return input.slice(0, 10);

  // intentar Date parse usando UTC
  const d = new Date(input);
  if (!isNaN(d.getTime())) {
    // Usar UTC para evitar problemas de zona horaria
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // intentar formato dd/MM/yyyy o dd-MM-yyyy
  const m = String(input).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = String(m[1]).padStart(2, "0");
    const month = String(m[2]).padStart(2, "0");
    const year = m[3];
    return `${year}-${month}-${day}`;
  }

  // fallback: devolver input tal cual
  return String(input);
}

function addDaysISO(startISO, days) {
  // Forzar interpretación UTC agregando 'T00:00:00Z'
  const dateStr = startISO.includes("T") ? startISO : `${startISO}T00:00:00Z`;
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + Number(days));

  // Retornar en formato YYYY-MM-DD usando UTC
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetweenISO(startISO, endISO) {
  // Forzar interpretación UTC
  const startStr = startISO.includes("T") ? startISO : `${startISO}T00:00:00Z`;
  const endStr = endISO.includes("T") ? endISO : `${endISO}T00:00:00Z`;

  const a = new Date(startStr);
  const b = new Date(endStr);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// convierte valores numéricos seguros (si vienen vacíos)
function toNumberSafe(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

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
    // const nombresesion = `MC${ucp}AGTE${dd}${mmStart}`;
    // const nombrearchivo = nombreArchivoTxt || `MC${ucp}AGTE${dd}${mmStart}.txt`;
    const nombresesion = `${ucp}AGTE${dd}${mmStart}`;
    const nombrearchivo = nombreArchivoTxt || `${ucp}AGTE${dd}${mmStart}.txt`;

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
          } pronósticos. Archivos generados: ${txtResult.txtName}, ${xlsxResult.xlsxName
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

  cargarTipoPronosticoxFechas = async (finicio, ffin, mc) => {
    try {
      if (!finicio || !ffin || !mc) {
        return {
          success: false,
          message: "finicio, ffin y mc son requeridos",
          data: null,
        };
      }

      // Normalizar a ISO (YYYY-MM-DD)
      const inicioIso = toISODateString(finicio);
      const finIso = toISODateString(ffin);
      if (!inicioIso || !finIso) {
        return {
          success: false,
          message: "Fechas con formato inválido",
          data: null,
        };
      }

      // Emular: dt_fechainicio = Convert.ToDateTime(fun.convertFechaDia(finicio));
      // usamos Date con inicioIso
      let i = 0;

      await sesionModel.borrarDatosTipoPronostico(mc);

      // Iterar mientras dt_fechainicio < dt_fechafin (igual que .NET)
      while (true) {
        // calcular la fecha a evaluar
        const fechaEvaluarIso = i === 0 ? inicioIso : addDaysISO(inicioIso, i);

        // condición de salida: si fechaEvaluarIso >= finIso rompemos (porque .NET usa <)
        if (new Date(fechaEvaluarIso) >= new Date(finIso)) break;

        // Buscar si ya existe el tipo para esa fecha
        const buscar = await sesionModel.buscarTipoPronostico(
          mc,
          fechaEvaluarIso
        );

        if (!buscar || buscar.length === 0) {
          // No existe -> ingresar
          await sesionModel.ingresarTipoPronostico(
            mc,
            fechaEvaluarIso,
            "Modelo RN"
          );
        } else {
          // Existe -> actualizar (tu model espera ordenar parámetros: tipopronostico, ucp, fecha)
          await sesionModel.actualizarTipoPronostico(
            "Modelo RN",
            mc,
            fechaEvaluarIso
          );
        }

        i++;
      }

      return {
        success: true,
        data: null,
        message: "Tipos de pronóstico actualizados correctamente",
      };
    } catch (error) {
      Logger.error(
        colors.red(
          "Error PronosticosService.cargarTipoPronosticoxFechas: " +
          (error && error.message ? error.message : error)
        )
      );
      return {
        success: false,
        data: null,
        message: "Error al ejecutar cargarTipoPronosticoxFechas",
      };
    }
  };

  /**
   * Llama a la API externa de predicción (http://localhost:8000/predict) o (http://localhost:8001/predict) si es produccion
   * n_days: número de días (default 60)
   * force_retrain: boolean
   * timeoutMs: timeout en ms (default 2 minutos)
   *
   * Devuelve: { success: boolean, data: any, raw: any, statusCode: number }
   */
  async callPredict(
    inicioIso,
    finIso,
    force_retrain = false,
    ucp,
    timeoutMs = 600000,
    modelo = false // Nuevo parámetro: false = /predict, true = /base-curve
  ) {
    const hostsToTry = ["127.0.0.1", "localhost"];
    //puerto produccion
    const port = 8001;
    //puerto desarrollo
    // const port = 8000;

    // Solo calcular n_days si es el modelo predict
    const n_days = !modelo ? daysBetweenISO(inicioIso, finIso) + 1 : null;

    for (const host of hostsToTry) {
      try {
        // Determinar endpoint y body según el modelo
        const endpoint = modelo ? "/base-curve" : "/predict";
        const url = `http://${host}:${port}${endpoint}`;

        const controller = new AbortController();
        const signal = controller.signal;

        const timer = setTimeout(() => {
          controller.abort();
        }, timeoutMs);

        // Body diferente según el modelo
        let requestBody;
        if (modelo) {
          // Modelo base-curve
          requestBody = {
            ucp: ucp,
            fecha_inicio: inicioIso,
            fecha_fin: finIso,
          };
        } else {
          // Modelo predict
          const endDateForApi = addDaysISO(inicioIso, -1);
          requestBody = {
            end_date: endDateForApi,
            n_days: n_days,
            force_retrain,
            ucp,
          };
        }

        const res = await fetch(url, {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal,
        });

        clearTimeout(timer);

        const statusCode = res.status;
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Logger.warn(
            colors.yellow(
              `callPredict: HTTP ${statusCode} desde ${host}:${port}${endpoint}`
            )
          );
          return { success: false, statusCode, data: json };
        }

        Logger.info(
          colors.green(
            `callPredict: Predicción exitosa desde ${host}:${port}${endpoint} para ${inicioIso} a ${finIso}`
          )
        );
        return { success: true, statusCode, data: json };
      } catch (err) {
        clearTimeout(timer);
        if (err && err.name === "AbortError") {
          Logger.warn(
            colors.yellow(
              `callPredict: request abortada por timeout (${timeoutMs}ms) hacia ${host}:${port}`
            )
          );
        } else {
          Logger.warn(
            colors.yellow(
              `callPredict: error conectando a ${host}:${port} — ${err && err.message ? err.message : err
              }`
            )
          );
        }
      }
    }

    Logger.error(
      colors.red(
        `callPredict: Falló en todos los hosts para ${inicioIso} a ${finIso}`
      )
    );
    return { success: false, statusCode: 0, data: null };
  }

  play = async (mc, finicio, ffin, force_retrain, modelo = false) => {
    try {
      // Validaciones básicas
      if (!mc || String(mc).trim() === "") {
        return {
          success: false,
          data: null,
          message: "Seleccione el Mercado Comercializador",
        };
      }
      if (!finicio || !ffin) {
        return {
          success: false,
          data: null,
          message: "Las fechas no pueden estar vacías",
        };
      }

      // Normalizar/ISO de entrada (se espera 'YYYY-MM-DD' o convertible)
      const inicioIso = toISODateString(finicio);
      const finIso = toISODateString(ffin);
      if (!inicioIso || !finIso) {
        return {
          success: false,
          data: null,
          message: "Formato de fecha inválido",
        };
      }

      // fecha inicio <= fecha fin
      if (new Date(inicioIso) > new Date(finIso)) {
        return {
          success: false,
          data: null,
          message: "La fecha inicial debe ser menor a la fecha final",
        };
      }

      // 1) Validar que la fecha inicio sea menor o igual a la fecha de actualización (verificar vFechainicial)
      const vFechainicialRows =
        await sesionModel.verificarFechaActualizaciondedatos(mc);
      if (!vFechainicialRows || vFechainicialRows.length === 0) {
        return {
          success: false,
          data: null,
          message:
            "No existe fecha para pronosticar en este Mercado Comercializador",
        };
      }
      // vFechainicialRows[0].fecha contiene la fecha de actualización en DB
      const fechaActualizacionIso = toISODateString(vFechainicialRows[0].fecha);
      // fechafinal permitida = searchFechaAñoDiaSiguiente(fechaActualizacion, 1) -> add 1 day from that stored date
      // Usamos addDaysISO helper (ya usada en tu proyecto)
      const fechaActualizacionPlus1 = addDaysISO(fechaActualizacionIso, 1);

      if (new Date(inicioIso) > new Date(fechaActualizacionPlus1)) {
        return {
          success: false,
          data: null,
          message: "La fecha inicial es mayor a la fecha de actualización",
        };
      }

      // 2) Validar que la fecha final esté dentro de la fecha del clima
      const vFechainicialClimaRows = await sesionModel.verificarFechaClima(mc);
      if (!vFechainicialClimaRows || vFechainicialClimaRows.length === 0) {
        return {
          success: false,
          data: null,
          message:
            "No existe fecha registrada para el clima en este mercado comercializador",
        };
      }
      const fechaClimaIso = toISODateString(vFechainicialClimaRows[0].fecha);
      if (new Date(finIso) > new Date(fechaClimaIso)) {
        return {
          success: false,
          data: null,
          message: "La fecha final es mayor a la fecha del clima",
        };
      }

      // 3) Inicializar proceso:borrar datos, etc.

      // Borrar datos previos
      await sesionModel.borrarDatosPronostico();
      await sesionModel.eliminarFechasIngresadasTodo();

      // Guardar las fechas que se van a pronosticar
      await sesionModel.guardarFechasPronosticas(inicioIso, finIso, mc);

      // Borrar datos por tipo de pronostico (si aplica)
      await sesionModel.borrarDatosTipoPronostico(mc).catch(() => { }); // no-fatal

      // Cargar tipo pronóstico por fechas (en .NET mp.cargarTipoPronosticoxFechas)
      if (
        typeof this.cargarTipoPronosticoxFechas !== "undefined" &&
        this?.cargarTipoPronosticoxFechas
      ) {
        try {
          await this.cargarTipoPronosticoxFechas(inicioIso, finIso, mc);
        } catch (e) {
          /* no-fatal */
        }
      }

      /* Llamada a la API con el modelo seleccionado */
      let predRes = null;
      try {
        predRes = await this.callPredict(
          inicioIso,
          finIso,
          !!force_retrain,
          mc,
          600000,
          modelo // Pasar el parámetro modelo
        );
        // log sencillo (no vuelques raw)
        Logger.info(
          "callPredict returned statusCode: " + (predRes?.statusCode ?? "n/a")
        );

        // Validación según el modelo usado
        let isValidResponse = false;

        if (modelo) {
          // Validación para base-curve
          isValidResponse =
            predRes?.success &&
            predRes?.data?.curves &&
            typeof predRes.data.curves === "object";
        } else {
          // Validación para predict
          isValidResponse =
            predRes?.success &&
            predRes?.data?.status === "success" &&
            Array.isArray(predRes?.data?.predictions);
        }

        if (!isValidResponse) {
          Logger.error(
            colors.red(
              "callPredict falló o devolvió payload inesperado: " +
              JSON.stringify(predRes?.data || {}).slice(0, 2000)
            )
          );
          return {
            success: false,
            data: null,
            message:
              "La API de predicción no respondió correctamente. Intente nuevamente.",
          };
        }
      } catch (err) {
        Logger.error(
          colors.red(
            "Error llamando a la API de predicción: " +
            (err && err.message ? err.message : err)
          )
        );
        return {
          success: false,
          data: null,
          message: "Error conectando con la API de predicción",
        };
      }

      console.log("predRes:", JSON.stringify(predRes, null, 5));
      // 4) Validar que existan los pronósticos generados
      // const validarPron = await sesionModel.cargarPeriodosPronosticosxUCPxFecha(
      //   mc,
      //   inicioIso,
      //   finIso
      // );
      // if (!validarPron || validarPron.length === 0) {
      //   return {
      //     success: false,
      //     data: null,
      //     message:
      //       "El pronóstico no se ejecutó correctamente. Intente nuevamente",
      //   };
      // }

      // 5) Obtener historicos (ultimos registros previos a la fecha inicio)
      // En .NET usan c.cargarPeriodosxUCPxFecha(mc, convertFechaAño(finicio)) -> devuelve últimos 30 (según query)
      const datosHistRows = await sesionModel.cargarPeriodosxUCPxFechaInicio(
        mc,
        inicioIso
      ); // tu modelo definido arriba
      const PeriodosHistoricos = Array.isArray(datosHistRows)
        ? datosHistRows.map((r) => ({
          fecha: toISODateString(r.fecha),
          p1: r.p1 == null ? null : r.p1,
          p2: r.p2 == null ? null : r.p2,
          p3: r.p3 == null ? null : r.p3,
          p4: r.p4 == null ? null : r.p4,
          p5: r.p5 == null ? null : r.p5,
          p6: r.p6 == null ? null : r.p6,
          p7: r.p7 == null ? null : r.p7,
          p8: r.p8 == null ? null : r.p8,
          p9: r.p9 == null ? null : r.p9,
          p10: r.p10 == null ? null : r.p10,
          p11: r.p11 == null ? null : r.p11,
          p12: r.p12 == null ? null : r.p12,
          p13: r.p13 == null ? null : r.p13,
          p14: r.p14 == null ? null : r.p14,
          p15: r.p15 == null ? null : r.p15,
          p16: r.p16 == null ? null : r.p16,
          p17: r.p17 == null ? null : r.p17,
          p18: r.p18 == null ? null : r.p18,
          p19: r.p19 == null ? null : r.p19,
          p20: r.p20 == null ? null : r.p20,
          p21: r.p21 == null ? null : r.p21,
          p22: r.p22 == null ? null : r.p22,
          p23: r.p23 == null ? null : r.p23,
          p24: r.p24 == null ? null : r.p24,
          observacion: r.observacion || "",
        }))
        : [];

      // 6) Construir PeriodosHistoricosGrafica iterando dia a dia entre inicio-fin
      const datosDemandaRows = await sesionModel.cargarPeriodosxUCPxFecha(
        mc,
        inicioIso,
        finIso
      );
      const rowsMapByDate = new Map();
      if (Array.isArray(datosDemandaRows)) {
        for (const r of datosDemandaRows) {
          const k = toISODateString(r.fecha);
          if (!rowsMapByDate.has(k)) rowsMapByDate.set(k, r);
        }
      }
      const PeriodosHistoricosGrafica = [];
      if (inicioIso && finIso) {
        const totalDias = daysBetweenISO(inicioIso, finIso);
        for (let j = 0; j <= totalDias; j++) {
          const fechaCheck = addDaysISO(inicioIso, j); // 'YYYY-MM-DD'
          const row = rowsMapByDate.get(fechaCheck);
          if (row) {
            // Solo añadimos si existe fila (paridad)
            PeriodosHistoricosGrafica.push({
              fecha: toISODateString(row.fecha),
              p1: toNumberSafe(row.p1),
              p2: toNumberSafe(row.p2),
              p3: toNumberSafe(row.p3),
              p4: toNumberSafe(row.p4),
              p5: toNumberSafe(row.p5),
              p6: toNumberSafe(row.p6),
              p7: toNumberSafe(row.p7),
              p8: toNumberSafe(row.p8),
              p9: toNumberSafe(row.p9),
              p10: toNumberSafe(row.p10),
              p11: toNumberSafe(row.p11),
              p12: toNumberSafe(row.p12),
              p13: toNumberSafe(row.p13),
              p14: toNumberSafe(row.p14),
              p15: toNumberSafe(row.p15),
              p16: toNumberSafe(row.p16),
              p17: toNumberSafe(row.p17),
              p18: toNumberSafe(row.p18),
              p19: toNumberSafe(row.p19),
              p20: toNumberSafe(row.p20),
              p21: toNumberSafe(row.p21),
              p22: toNumberSafe(row.p22),
              p23: toNumberSafe(row.p23),
              p24: toNumberSafe(row.p24),
              observacion: row.observacion || "",
            });
          }
        }
      }

      // 7) PeriodosPronosticos desde el resultado de callPredict

      // Procesar pronósticos según el modelo
      let PeriodosPronosticos = [];

      if (modelo) {
        // Procesamiento para base-curve
        const curves = predRes?.data?.curves || {};

        for (const [fecha, valores] of Object.entries(curves)) {
          const fechaIso = toISODateString(fecha);

          // Verificar que la fecha esté en el rango
          if (
            new Date(fechaIso) >= new Date(inicioIso) &&
            new Date(fechaIso) <= new Date(finIso) &&
            Array.isArray(valores) &&
            valores.length === 24
          ) {
            PeriodosPronosticos.push({
              fecha: fechaIso,
              p1: toNumberSafe(valores[0]),
              p2: toNumberSafe(valores[1]),
              p3: toNumberSafe(valores[2]),
              p4: toNumberSafe(valores[3]),
              p5: toNumberSafe(valores[4]),
              p6: toNumberSafe(valores[5]),
              p7: toNumberSafe(valores[6]),
              p8: toNumberSafe(valores[7]),
              p9: toNumberSafe(valores[8]),
              p10: toNumberSafe(valores[9]),
              p11: toNumberSafe(valores[10]),
              p12: toNumberSafe(valores[11]),
              p13: toNumberSafe(valores[12]),
              p14: toNumberSafe(valores[13]),
              p15: toNumberSafe(valores[14]),
              p16: toNumberSafe(valores[15]),
              p17: toNumberSafe(valores[16]),
              p18: toNumberSafe(valores[17]),
              p19: toNumberSafe(valores[18]),
              p20: toNumberSafe(valores[19]),
              p21: toNumberSafe(valores[20]),
              p22: toNumberSafe(valores[21]),
              p23: toNumberSafe(valores[22]),
              p24: toNumberSafe(valores[23]),
              observacion: "",
            });
          }
        }

        // Ordenar por fecha
        PeriodosPronosticos.sort(
          (a, b) => new Date(a.fecha) - new Date(b.fecha)
        );
      } else {
        // Procesamiento para predict (código original)
        if (
          predRes?.data?.predictions &&
          Array.isArray(predRes.data.predictions)
        ) {
          PeriodosPronosticos = predRes.data.predictions
            .filter((p) => {
              const fechaIso = toISODateString(p.fecha);
              return (
                new Date(fechaIso) >= new Date(inicioIso) &&
                new Date(fechaIso) <= new Date(finIso)
              );
            })
            .map((p) => ({
              fecha: toISODateString(p.fecha),
              p1: toNumberSafe(p.P1),
              p2: toNumberSafe(p.P2),
              p3: toNumberSafe(p.P3),
              p4: toNumberSafe(p.P4),
              p5: toNumberSafe(p.P5),
              p6: toNumberSafe(p.P6),
              p7: toNumberSafe(p.P7),
              p8: toNumberSafe(p.P8),
              p9: toNumberSafe(p.P9),
              p10: toNumberSafe(p.P10),
              p11: toNumberSafe(p.P11),
              p12: toNumberSafe(p.P12),
              p13: toNumberSafe(p.P13),
              p14: toNumberSafe(p.P14),
              p15: toNumberSafe(p.P15),
              p16: toNumberSafe(p.P16),
              p17: toNumberSafe(p.P17),
              p18: toNumberSafe(p.P18),
              p19: toNumberSafe(p.P19),
              p20: toNumberSafe(p.P20),
              p21: toNumberSafe(p.P21),
              p22: toNumberSafe(p.P22),
              p23: toNumberSafe(p.P23),
              p24: toNumberSafe(p.P24),
              observacion: "",
            }));
        }
      }

      const predData = predRes && predRes.data ? predRes.data : {};
      const metadata = predData.metadata ?? null;
      const should_retrain_flag =
        typeof predData.should_retrain !== "undefined"
          ? predData.should_retrain
          : null;
      const rawPredictions = Array.isArray(predData.predictions)
        ? predData.predictions
        : predData.curves || null;

      // Armar respuesta
      const payload = {
        success: true,
        historicos: PeriodosHistoricos,
        pronosticosTabla: PeriodosPronosticos,
        pronosticosGrafica: PeriodosPronosticos,
        historicosGrafica: PeriodosHistoricosGrafica,
        metadata,
        should_retrain: should_retrain_flag,
        rawPredictions,
        modeloUsado: modelo ? "base-curve" : "predict", // Info adicional
      };

      console.log("payload:", payload);
      return {
        success: true,
        data: payload,
        message: "Ejecución play completada",
      };
    } catch (error) {
      Logger.error(
        colors.red(
          "Error PronosticosService.play: " +
          (error && error.message ? error.message : error)
        )
      );
      return { success: false, data: null, message: "Error al ejecutar play" };
    }
  };

  /**
   * Llama al endpoint /retrain?ucp=... probando hostsToTry uno a uno y con timeout.
   * Retorna { success: boolean, statusCode?, data?, host? }
   */
  retrainModel = async (ucp, timeoutMs = 600000) => {
    const hostsToTry = ["127.0.0.1", "localhost"];
    //puerto produccion
    const port = 8001;
    //puerto desarrollo
    // const port = 8000;
    for (const host of hostsToTry) {
      const url = `http://${host}:${port}/retrain?ucp=${encodeURIComponent(
        String(ucp)
      )}`;
      const controller = new AbortController();
      const signal = controller.signal;
      let timer;
      try {
        timer = setTimeout(() => {
          controller.abort();
        }, timeoutMs);

        Logger.info(
          colors.green(`PredictService.retrainModel: llamando ${url}`)
        );

        const res = await fetch(url, {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          // body vacío (el endpoint /retrain según tu ejemplo no requiere body)
          signal,
        });

        clearTimeout(timer);

        const statusCode = res.status;
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Logger.warn(
            colors.yellow(
              `PredictService.retrainModel: HTTP ${statusCode} desde ${host}:${port}`
            )
          );
          // devolvemos info para que el controller decida
          return { success: false, statusCode, data: json, host };
        }

        Logger.info(
          colors.green(
            `PredictService.retrainModel: éxito desde ${host}:${port} para ucp=${ucp}`
          )
        );
        return { success: true, statusCode, data: json, host };
      } catch (err) {
        if (timer) clearTimeout(timer);
        if (err && err.name === "AbortError") {
          Logger.warn(
            colors.yellow(
              `PredictService.retrainModel: request abortada por timeout (${timeoutMs}ms) hacia ${host}:${port}`
            )
          );
        } else {
          Logger.warn(
            colors.yellow(
              `PredictService.retrainModel: error conectando a ${host}:${port} — ${err && err.message ? err.message : err
              }`
            )
          );
        }
        // probar siguiente host
      }
    }

    Logger.error(
      colors.red(
        `PredictService.retrainModel: Falló en todos los hosts para ucp=${ucp}`
      )
    );
    return { success: false, statusCode: 0, data: null };
  };

  // Método para obtener eventos
  async getEvents(inicioIso, finIso, ucp, timeoutMs = 600000) {
    const hostsToTry = ["127.0.0.1", "localhost"];
    //puerto produccion
    const port = 8001;
    //puerto desarrollo
    // const port = 8000;

    for (const host of hostsToTry) {
      let timer; // <-- declarar fuera del try para que catch/finally lo vean
      try {
        const url = `http://${host}:${port}/get_events`;
        const controller = new AbortController();
        const signal = controller.signal;

        // timer para abortar
        timer = setTimeout(() => {
          controller.abort();
        }, timeoutMs);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ucp,
            fecha_inicio: inicioIso,
            fecha_fin: finIso,
          }),
          signal,
        });

        // Si llegó hasta aquí, cancelar timer
        clearTimeout(timer);
        timer = undefined;

        const statusCode = res.status;
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Logger.warn(
            colors.yellow(`getEvents: HTTP ${statusCode} desde ${host}:${port}`)
          );
          return { success: false, statusCode, data: json };
        }

        Logger.info(
          colors.green(
            `getEvents: Eventos obtenidos exitosamente desde ${host}:${port} para ${inicioIso} a ${finIso}`
          )
        );
        return { success: true, statusCode, data: json };
      } catch (err) {
        // Asegurarnos de limpiar el timer si existe
        if (typeof timer !== "undefined") {
          clearTimeout(timer);
          timer = undefined;
        }

        if (err && err.name === "AbortError") {
          Logger.warn(
            colors.yellow(
              `getEvents: request abortada por timeout (${timeoutMs}ms) hacia ${host}:${port}`
            )
          );
        } else {
          Logger.warn(
            colors.yellow(
              `getEvents: error conectando a ${host}:${port} — ${err && err.message ? err.message : err
              }`
            )
          );
        }
        // continuar al siguiente host
      } finally {
        // por seguridad, limpiar timer si quedó
        if (typeof timer !== "undefined") {
          clearTimeout(timer);
          timer = undefined;
        }
      }
    }

    Logger.error(
      colors.red(
        `getEvents: Falló en todos los hosts para ${inicioIso} a ${finIso}`
      )
    );
    return { success: false, statusCode: 0, data: null };
  }

  async errorFeedback(
    end_date,
    force_retrain = false,
    ucp,
    timeoutMs = 600000
  ) {
    const hostsToTry = ["127.0.0.1", "localhost"];
    //puerto produccion
    const port = 8001;
    //puerto desarrollo
    // const port = 8000;

    for (const host of hostsToTry) {
      let timer;
      try {
        const url = `http://${host}:${port}/Error-feedback`;
        const controller = new AbortController();
        const signal = controller.signal;

        timer = setTimeout(() => {
          controller.abort();
        }, timeoutMs);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ucp,
            end_date,
            force_retrain,
          }),
          signal,
        });

        clearTimeout(timer);

        const statusCode = res.status;
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Logger.warn(
            colors.yellow(
              `errorFeedback: HTTP ${statusCode} desde ${host}:${port}`
            )
          );
          return { success: false, statusCode, data: json };
        }

        return {
          success: true,
          statusCode,
          data: json, // { reason: "..." }
        };
      } catch (err) {
        clearTimeout(timer);
        if (err?.name === "AbortError") {
          Logger.warn(
            colors.yellow(
              `errorFeedback: timeout (${timeoutMs}ms) hacia ${host}:${port}`
            )
          );
        } else {
          Logger.warn(
            colors.yellow(
              `errorFeedback: error conectando a ${host}:${port} — ${err?.message || err
              }`
            )
          );
        }
      }
    }

    Logger.error(colors.red(`errorFeedback: Falló en todos los hosts`));

    return { success: false, statusCode: 0, data: null };
  }

  traerDatosClimaticos = async (ucp, fechainicio, fechafin) => {
    try {
      const rows =
        await configuracionModel.cargarVariablesClimaticasxFechaPeriodos(
          ucp,
          fechainicio,
          fechafin
        );

      const resultado = [];

      for (const row of rows) {
        const periodos = [];

        for (let i = 1; i <= 24; i++) {
          const iconId = row[`p${i}_i`];
          const esDia = i >= 7 && i <= 18;
          let icono = null;

          if (iconId && iconId !== "0") {
            // 🔹 intento exacto como .NET
            const iconRow = await configuracionModel.buscarIcono(
              iconId,
              esDia ? "si" : "no",
              esDia ? "no" : "si"
            );

            if (iconRow) {
              // 🔥 REGLA REAL DE TU DB
              icono = iconRow.icon_dia ?? iconRow.icon_noche ?? null;
            }

            // 🔁 fallback (.NET buscarIcono2)
            if (!icono) {
              const fallback = await configuracionModel.buscarIcono2(iconId);
              if (fallback) {
                icono = fallback.icon_dia ?? fallback.icon_noche ?? null;
              }
            }
          }

          periodos.push({
            periodo: i,
            temperatura: Number(row[`p${i}_t`] ?? 0),
            humedad: Number(row[`p${i}_h`] ?? 0),
            viento: Number(row[`p${i}_v`] ?? 0),
            icono,
          });
        }

        resultado.push({
          fecha: row.fecha,
          periodos,
        });
      }

      return {
        success: true,
        data: resultado,
        message: "Datos climáticos obtenidos correctamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error traerDatosClimaticos"), error);
      return {
        success: false,
        data: null,
        message: "Error al obtener datos climáticos",
      };
    }
  };
}
