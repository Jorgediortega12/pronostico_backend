import SesionModel from "../models/sesion.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

const model = SesionModel.getInstance();

// helpers de fecha (robustos a entradas vacías y varios formatos básicos)
function toISODateString(input) {
  if (!input && input !== 0) return "";
  // si ya viene en formato YYYY-MM-DD
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}/.test(input))
    return input.slice(0, 10);
  // intentar Date parse
  const d = new Date(input);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // intentar formato dd/MM/yyyy o dd-MM-yyyy
  const m = input.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = String(m[1]).padStart(2, "0");
    const month = String(m[2]).padStart(2, "0");
    const year = m[3];
    return `${year}-${month}-${day}`;
  }
  // fallback: devolver input tal cual
  return input;
}

function addDaysISO(startISO, days) {
  const d = new Date(startISO);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function daysBetweenISO(startISO, endISO) {
  const a = new Date(startISO);
  const b = new Date(endISO);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// convierte valores numéricos seguros (si vienen vacíos)
function toNumberSafe(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export default class SesionService {
  static instance;

  static getInstance() {
    if (!SesionService.instance) {
      SesionService.instance = new SesionService();
    }
    return SesionService.instance;
  }

  cargarDatosSesiones = async (codsuperior) => {
    try {
      const datosSesiones = await model.cargarDatosSesiones(codsuperior);

      if (!datosSesiones) {
        return {
          success: false,
          data: null,
          message: "No se pudieron cargar los datos de las sesiones",
        };
      }

      return {
        success: true,
        data: datosSesiones,
        message: "Carga de datos por sesiones cargadas exitosamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error SesionServices cargarDatosSesiones"));
      return {
        success: false,
        data: null,
        message: "Error al cargar los datos por sesiones",
      };
    }
  };

  cargarArchivosVrSesiones = async (codcarpeta) => {
    try {
      const archivosVrSesiones = await model.cargarArchivosVrSesiones(
        codcarpeta
      );

      if (!archivosVrSesiones) {
        return {
          success: false,
          data: null,
          message: "No se pudo cargar los archivos de versiones por sesiones",
        };
      }

      return {
        success: true,
        data: archivosVrSesiones,
        messasge: "Archivos de versiones de sesiones cargados exitosamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error SesionServices cargarArchivosVrSesiones"));
      return {
        success: false,
        data: null,
        messasge: "Error al cargar los archivos por versiones de sesiones",
      };
    }
  };

  buscarVersionSesionCod = async (codigo) => {
    try {
      const versionSesionCod = await model.buscarVersionSesionCod(codigo);

      if (!versionSesionCod) {
        return {
          success: false,
          data: null,
          message: "Error al buscar version de sesiones por codigo",
        };
      }

      return {
        success: true,
        data: versionSesionCod,
        message: "La busqueda de version de sesion por codigo fue exitosa",
      };
    } catch (error) {
      Logger.error(colors.red("Error sesionServices buscarVersionSesionCod"));
      return {
        success: false,
        data: null,
        message: "Error al buscar la version de la sesion por codigo",
      };
    }
  };

  cargarPeriodosSesion = async (codsesion, tipo) => {
    try {
      const sesionesPeriodos = await model.cargarPeriodosSesion(
        codsesion,
        tipo
      );

      if (!sesionesPeriodos) {
        return {
          success: false,
          data: null,
          message: "Error al obtener la sesiones por periodos",
        };
      }

      return {
        success: true,
        data: sesionesPeriodos,
        message: "Se obtuvieron las sesiones por periodo correctamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error sesionServices obtenerSesionesPeriodos"));
      return {
        success: false,
        data: null,
        message: "Error al obtener las sesiones por periodos",
      };
    }
  };

  cargarPeriodosxUCPxFecha = async (ucp, fechainicio, fechafin) => {
    try {
      const actualizacionDatos = await model.cargarPeriodosxUCPxFecha(
        ucp,
        fechainicio,
        fechafin
      );

      if (!actualizacionDatos) {
        return {
          success: false,
          data: null,
          message: "No se pudo obtener la actualizacion de datos",
        };
      }

      return {
        success: true,
        data: actualizacionDatos,
        message: "Obtener actualizacion de datos exitosa",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error sesionServices obtenerActualizacionDatos")
      );
      return {
        success: false,
        data: null,
        message: "No se pudieron obtener la actualizacion de datos",
      };
    }
  };

  cargarSesion = async (codigo) => {
    try {
      // 1) buscar version de sesion por codigo
      const versionRows = await model.buscarVersionSesionCod(codigo);
      if (!versionRows || versionRows.length === 0) {
        return {
          success: false,
          data: null,
          message:
            "No se ha podido encontrar información acerca de esta sesión.",
        };
      }

      // asumimos que model.buscarVersionSesionCod devuelve array de rows
      const dato = versionRows[0];

      // preparar campos (converts)
      const nomsesion = `<b>Sesión cargada: </b>${dato.nombre} v${dato.version}<br/><hr />`;
      const mc = dato.ucp; // nombre del UCP según .NET
      const fechainicio = dato.fechainicio
        ? toISODateString(dato.fechainicio)
        : "";
      const fechafin = dato.fechafin ? toISODateString(dato.fechafin) : "";
      const dropManual = dato.edicionfiltro;
      const dropUltimo = dato.edicionperiodo;
      const diareferencia = dato.fechainicio
        ? toISODateString(dato.fechainicio)
        : "";
      const tipoedicion = dato.tendencia;
      const tipodias = dato.dias;
      const v_pDias = dato.edicionsuma;
      const tipodatos = dato.tipodatos;

      // parametros p1..p24 diarios (si existen en fila)
      const pDiario = {};
      for (let i = 1; i <= 24; i++) {
        pDiario[`p${i}_diario`] =
          dato[`p${i}_diario`] !== undefined
            ? String(dato[`p${i}_diario`])
            : "";
      }

      // 2) Periodos pronosticos (tipo 'P') -> usando model.cargarPeriodosSesion(codsesion, tipo)
      const codigoSesion =
        dato.codigo || dato.codsesion || dato.id || dato.codigo_sesion; // intentar varias claves
      const pronRows = await model.cargarPeriodosSesion(codigoSesion, "P");
      const PeriodosPronosticos = Array.isArray(pronRows)
        ? pronRows.map((r) => ({
            fecha: toISODateString(r.fecha),
            p1: toNumberSafe(r.p1),
            p2: toNumberSafe(r.p2),
            p3: toNumberSafe(r.p3),
            p4: toNumberSafe(r.p4),
            p5: toNumberSafe(r.p5),
            p6: toNumberSafe(r.p6),
            p7: toNumberSafe(r.p7),
            p8: toNumberSafe(r.p8),
            p9: toNumberSafe(r.p9),
            p10: toNumberSafe(r.p10),
            p11: toNumberSafe(r.p11),
            p12: toNumberSafe(r.p12),
            p13: toNumberSafe(r.p13),
            p14: toNumberSafe(r.p14),
            p15: toNumberSafe(r.p15),
            p16: toNumberSafe(r.p16),
            p17: toNumberSafe(r.p17),
            p18: toNumberSafe(r.p18),
            p19: toNumberSafe(r.p19),
            p20: toNumberSafe(r.p20),
            p21: toNumberSafe(r.p21),
            p22: toNumberSafe(r.p22),
            p23: toNumberSafe(r.p23),
            p24: toNumberSafe(r.p24),
            observacion: r.observacion || "",
          }))
        : [];

      // 3) Periodos historicos (tipo 'D')
      const histRows = await model.cargarPeriodosSesion(codigoSesion, "D");
      const PeriodosHistoricos = Array.isArray(histRows)
        ? histRows.map((r) => ({
            fecha: toISODateString(r.fecha),
            p1: toNumberSafe(r.p1),
            p2: toNumberSafe(r.p2),
            p3: toNumberSafe(r.p3),
            p4: toNumberSafe(r.p4),
            p5: toNumberSafe(r.p5),
            p6: toNumberSafe(r.p6),
            p7: toNumberSafe(r.p7),
            p8: toNumberSafe(r.p8),
            p9: toNumberSafe(r.p9),
            p10: toNumberSafe(r.p10),
            p11: toNumberSafe(r.p11),
            p12: toNumberSafe(r.p12),
            p13: toNumberSafe(r.p13),
            p14: toNumberSafe(r.p14),
            p15: toNumberSafe(r.p15),
            p16: toNumberSafe(r.p16),
            p17: toNumberSafe(r.p17),
            p18: toNumberSafe(r.p18),
            p19: toNumberSafe(r.p19),
            p20: toNumberSafe(r.p20),
            p21: toNumberSafe(r.p21),
            p22: toNumberSafe(r.p22),
            p23: toNumberSafe(r.p23),
            p24: toNumberSafe(r.p24),
            observacion: r.observacion || "",
          }))
        : [];

      // 4) PeriodosHistoricosGrafica
      // .NET usa: c.cargarPeriodosxUCPxFecha(mc, fechainicio, fechafin)
      // Pero tu modelo tiene firma (ucp, fecha). Aquí pedimos al model los registros relacionados al UCP
      // (por ejemplo desde fechainicio) y luego hacemos el recorrido por dias y buscamos coincidencias.
      // dentro de cargarSesion
      const datosDemandaRows = await model.cargarPeriodosxUCPxFecha(
        mc,
        fechainicio,
        fechafin
      );
      const rowsMapByDate = new Map();
      if (Array.isArray(datosDemandaRows)) {
        for (const r of datosDemandaRows) {
          const k = toISODateString(r.fecha);
          if (!rowsMapByDate.has(k)) rowsMapByDate.set(k, r);
        }
      }

      const PeriodosHistoricosGrafica = [];
      if (fechainicio && fechafin) {
        const totalDias = daysBetweenISO(fechainicio, fechafin);
        for (let j = 0; j <= totalDias; j++) {
          const fechaCheck = addDaysISO(fechainicio, j); // 'YYYY-MM-DD'
          const row = rowsMapByDate.get(fechaCheck);
          if (row) {
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
          } else {
            // si no hay dato, puedes optar por agregar solo la fecha (como hace el .NET: "si no encuentra nada, mostrar solo la fecha")
            PeriodosHistoricosGrafica.push({
              fecha: fechaCheck,
              p1: 0,
              p2: 0,
              p3: 0,
              p4: 0,
              p5: 0,
              p6: 0,
              p7: 0,
              p8: 0,
              p9: 0,
              p10: 0,
              p11: 0,
              p12: 0,
              p13: 0,
              p14: 0,
              p15: 0,
              p16: 0,
              p17: 0,
              p18: 0,
              p19: 0,
              p20: 0,
              p21: 0,
              p22: 0,
              p23: 0,
              p24: 0,
              observacion: "",
            });
          }
        }
      }

      // 5) construir la respuesta (para mantener compatibilidad con .NET devolvemos un objeto que contiene los campos)
      const payload = {
        success: true,
        nomsesion,
        mc,
        fechainicio,
        fechafin,
        dropmanual: dropManual,
        dropultimo: dropUltimo,
        diareferencia,
        tipoedicion,
        tipodias,
        v_pDias,
        tipodatos,
        ...pDiario, // p1_diario..p24_diario
        PeriodosPronosticos,
        PeriodosHistoricos,
        PeriodosHistoricosGrafica,
      };

      // según tus services anteriores, encapsular en success/data/message
      return {
        success: true,
        data: payload,
        message: "Sesión cargada correctamente",
      };
    } catch (error) {
      Logger.error(
        colors.red(
          "Error sesionServices cargarSesion: " +
            (error && error.message ? error.message : error)
        )
      );
      return {
        success: false,
        data: null,
        message: "Error al cargar la sesión",
      };
    }
  };
}
