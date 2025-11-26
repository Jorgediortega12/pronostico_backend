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

    // Determinar stopDate y startDate similares a tu flujo previo:
    // stopDate: reportMoment (última fecha - 6 días) si existe, sino hoy
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

    // nombresesion y nombrearchivo como en C#
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

    // Other metadata fields expected by agregarVersionSesion in C#:
    // datos.tipodatos, datos.tipoedicion, datos.ediciontipodia, datos.edicionmanual,
    // datos.edicionultimo, datos.ediciondiareferencia, datos.cuadropdias, datos.cargaindustrial
    // we will pass them as available or default to empty / null
    const meta = {
      tipodatos: datos.tipodatos ?? null,
      tipoedicion: datos.tipoedicion ?? null,
      ediciontipodia: datos.ediciontipodia ?? null,
      edicionmanual: datos.edicionmanual ?? null,
      edicionultimo: datos.edicionultimo ?? null,
      ediciondiareferencia: datos.ediciondiareferencia ?? null,
      cuadropdias: datos.cuadropdias ?? null,
      cargaindustrial: datos.cargaindustrial ?? null,
    };

    try {
      // 1) buscar versión existente
      // Ajusta la firma si tu model.buscarVersionSesion no necesita client como primer arg.
      const versionRow = await model.buscarVersionSesion(nombresesion);

      // calcular nroversion
      let nroversion = 1;
      if (
        versionRow &&
        (versionRow.version || versionRow.rows || Array.isArray(versionRow))
      ) {
        // soporte varias formas de retorno
        const v =
          versionRow.version ??
          (versionRow.rows &&
            versionRow.rows[0] &&
            versionRow.rows[0].version) ??
          (Array.isArray(versionRow) && versionRow[0] && versionRow[0].version);
        if (v) nroversion = 1 + parseInt(v, 10);
      }

      // 2) agregarVersionSesion -> debe devolver el registro nuevo (o al menos el codigo)
      // Firma esperada: model.agregarVersionSesion({ ...params... }) -> { codigo: <id> }
      const agregarParams = {
        fechaRegistro: moment().format("YYYYMMDDHHmmss"), // fun.getFechaAñoHoraActual() equivalente
        ucp,
        fechaInicio: convertFechaAño(fecha_inicio),
        fechaFin: convertFechaAño(fecha_fin),
        tipodatos: meta.tipodatos,
        tipoedicion: meta.tipoedicion,
        ediciontipodia: meta.ediciontipodia,
        edicionmanual: meta.edicionmanual,
        edicionultimo: meta.edicionultimo,
        unknownField: "", // correspondía a "" en C#
        ediciondiareferencia: meta.ediciondiareferencia,
        cuadropdias: meta.cuadropdias,
        nombresesion,
        nroversion: String(nroversion),
        usuario,
        // luego los 24 cuadros en orden
        cuadroperiodos: [
          cuadro.cuadroperiodo1,
          cuadro.cuadroperiodo2,
          cuadro.cuadroperiodo3,
          cuadro.cuadroperiodo4,
          cuadro.cuadroperiodo5,
          cuadro.cuadroperiodo6,
          cuadro.cuadroperiodo7,
          cuadro.cuadroperiodo8,
          cuadro.cuadroperiodo9,
          cuadro.cuadroperiodo10,
          cuadro.cuadroperiodo11,
          cuadro.cuadroperiodo12,
          cuadro.cuadroperiodo13,
          cuadro.cuadroperiodo14,
          cuadro.cuadroperiodo15,
          cuadro.cuadroperiodo16,
          cuadro.cuadroperiodo17,
          cuadro.cuadroperiodo18,
          cuadro.cuadroperiodo19,
          cuadro.cuadroperiodo20,
          cuadro.cuadroperiodo21,
          cuadro.cuadroperiodo22,
          cuadro.cuadroperiodo23,
          cuadro.cuadroperiodo24,
        ],
        nombrearchivo,
        cargaindustrial: meta.cargaindustrial ?? null,
      };

      // Llamada al model: adáptala si tu firma espera parámetros posicionales.
      let resAgregar = null;
      if (typeof model.agregarVersionSesion === "function") {
        // try object style
        try {
          resAgregar = await model.agregarVersionSesion(agregarParams);
        } catch (err) {
          // fallback: intentar firma posicional (24 cuadros explícitos)
          const vals = [
            agregarParams.fechaRegistro,
            agregarParams.ucp,
            agregarParams.fechaInicio,
            agregarParams.fechaFin,
            agregarParams.tipodatos,
            agregarParams.tipoedicion,
            agregarParams.ediciontipodia,
            agregarParams.edicionmanual,
            agregarParams.edicionultimo,
            agregarParams.unknownField,
            agregarParams.ediciondiareferencia,
            agregarParams.cuadropdias,
            agregarParams.nombresesion,
            agregarParams.nroversion,
            agregarParams.usuario,
            ...agregarParams.cuadroperiodos,
            agregarParams.nombrearchivo,
            agregarParams.cargaindustrial,
          ];
          resAgregar = await model.agregarVersionSesion(vals);
        }
      } else {
        throw new Error("model.agregarVersionSesion no definido");
      }

      // Obtener codigo de sesión
      let codsesionId = null;
      if (resAgregar) {
        codsesionId =
          (resAgregar.codigo ??
            (resAgregar.rows &&
              resAgregar.rows[0] &&
              resAgregar.rows[0].codigo) ??
            (resAgregar[0] && resAgregar[0].codigo)) ||
          null;
      }
      if (!codsesionId) {
        // Si la función devolvió la fila entera (ej: { rows: [...] })
        if (resAgregar && resAgregar.rows && resAgregar.rows[0])
          codsesionId =
            resAgregar.rows[0].codigo || resAgregar.rows[0].id || null;
      }

      if (!codsesionId) {
        // no pudimos obtener id -> rollback y error
        await client.query("ROLLBACK");
        throw new Error(
          "No se pudo obtener id de sesión al insertar agregarVersionSesion"
        );
      }

      // 3) Insertar Pronóstico: por cada registro llamar agregarDatosPronosticoxSesion
      // Firma esperada: model.agregarDatosPronosticoxSesion(codsesion, someId, fechaYYYYMMDD, p1..p24, observacion, tipo)
      for (const rec of pronosticoList) {
        const fechaConv = convertFechaAño(rec.fecha);
        // asegurarse de que p1..p24 existan y con '.' decimal
        const pVals = [];
        for (let i = 1; i <= 24; i++) {
          const key = `p${i}`;
          const vRaw =
            rec[key] != null && String(rec[key]).trim() !== ""
              ? String(rec[key]).replace(",", ".")
              : "0";
          pVals.push(vRaw);
        }
        const observacion = rec.observacion ?? "";
        const tipo = "P";
        // Intentar llamada object-style, fallback positional
        if (typeof model.agregarDatosPronosticoxSesion === "function") {
          try {
            await model.agregarDatosPronosticoxSesion({
              codsesion: String(codsesionId),
              someId: "0",
              fecha: fechaConv,
              p: pVals, // si tu model espera p1..p24, lo adaptamos abajo
              observacion,
              tipo,
            });
          } catch (err) {
            // fallback a positional: codsesion, someId, fecha, p1..p24, observacion, tipo
            const vals = [
              String(codsesionId),
              "0",
              fechaConv,
              ...pVals,
              observacion,
              tipo,
            ];
            await model.agregarDatosPronosticoxSesion(vals);
          }
        } else {
          throw new Error("model.agregarDatosPronosticoxSesion no definido");
        }
      }

      // 4) Insertar Histórico (tipo "D")
      for (const rec of historicoList) {
        const fechaConv = convertFechaAño(rec.fecha);
        const pVals = [];
        for (let i = 1; i <= 24; i++) {
          const key = `p${i}`;
          const vRaw =
            rec[key] != null && String(rec[key]).trim() !== ""
              ? String(rec[key]).replace(",", ".")
              : "0";
          pVals.push(vRaw);
        }
        const observacion = rec.observacion ?? "";
        const tipo = "D";
        try {
          await model.agregarDatosPronosticoxSesion({
            codsesion: String(codsesionId),
            someId: "0",
            fecha: fechaConv,
            p: pVals,
            observacion,
            tipo,
          });
        } catch (err) {
          const vals = [
            String(codsesionId),
            "0",
            fechaConv,
            ...pVals,
            observacion,
            tipo,
          ];
          await model.agregarDatosPronosticoxSesion(vals);
        }
      }

      // Commit
      await client.query("COMMIT");
      return {
        success: true,
        codsesion: codsesionId,
        nombresesion,
        nombrearchivo,
      };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      // rethrow para que el caller lo loguee
      throw err;
    } finally {
      client.release();
    }
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
      if (typeof saveSessionAndData !== "function") {
        Logger.warn(
          "saveSessionAndData no definido - se omite guardado de sesión"
        );
      } else {
        try {
          // sessionModel debe ser el model que implementa buscarVersionSesion/agregarVersionSesion/agregarDatosPronosticoxSesion
          const sessionResult = await saveSessionAndData({
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
