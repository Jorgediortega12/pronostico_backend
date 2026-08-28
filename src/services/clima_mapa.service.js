import ClimaMapaModel from "../models/clima_mapa.model.js";
import ConfiguracionModel from "../models/configuracion.model.js";
import ConfiguracionService from "./configuracion.service.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import { createConectionPG } from "../helpers/connections.js";
import { ejecutarIngestaClimaMapa } from "./clima_mapa_ingesta.service.js";
import { generarXlsxSensacionTermica } from "../utils/generarXlsxSensacionTermica.js";

const model = ClimaMapaModel.getInstance();
const configuracionModel = ConfiguracionModel.getInstance();
const configuracionService = ConfiguracionService.getInstance();

export default class ClimaMapaService {
  static instance;

  static getInstance() {
    if (!ClimaMapaService.instance) {
      ClimaMapaService.instance = new ClimaMapaService();
    }
    return ClimaMapaService.instance;
  }

  listarPuntos = async (session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.listarPuntosConClima(client);
      return {
        success: true,
        data: rows,
        message: "Puntos cargados exitosamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaService listarPuntos"));
      return {
        success: false,
        data: null,
        message: "Error al cargar los puntos",
      };
    }
  };

  crearPunto = async (datos, session) => {
    try {
      const client = createConectionPG(session);
      const punto = await model.crearPunto(datos, client);
      return {
        success: true,
        data: punto,
        message: "Punto creado exitosamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaService crearPunto"));
      return {
        success: false,
        data: null,
        message: "Error al crear el punto",
      };
    }
  };

  actualizarPunto = async (datos, session) => {
    try {
      const client = createConectionPG(session);
      const punto = await model.actualizarPunto(datos, client);
      if (!punto) {
        return {
          success: false,
          data: null,
          message: "Punto no encontrado",
        };
      }
      return {
        success: true,
        data: punto,
        message: "Punto actualizado exitosamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaService actualizarPunto"));
      return {
        success: false,
        data: null,
        message: "Error al actualizar el punto",
      };
    }
  };

  eliminarPunto = async (id, session) => {
    try {
      const client = createConectionPG(session);
      const eliminado = await model.eliminarPunto(id, client);
      if (!eliminado) {
        return {
          success: false,
          data: null,
          message: "Punto no encontrado",
        };
      }
      return {
        success: true,
        data: null,
        message: "Punto eliminado exitosamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaService eliminarPunto"));
      return {
        success: false,
        data: null,
        message: "Error al eliminar el punto",
      };
    }
  };

  cargarHoraPorPunto = async (idPunto, fecha, session) => {
    try {
      const client = createConectionPG(session);
      const fila = await model.horaPorPunto(idPunto, fecha, client);
      if (!fila) {
        return {
          success: false,
          data: null,
          message: "No hay datos horarios para esa fecha",
        };
      }
      return {
        success: true,
        data: fila,
        message: "Datos horarios cargados exitosamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaService cargarHoraPorPunto"));
      return {
        success: false,
        data: null,
        message: "Error al cargar los datos horarios",
      };
    }
  };

  cargarDiaPorPunto = async (idPunto, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.diaPorPunto(idPunto, client);
      return {
        success: true,
        data: rows,
        message: "Pronóstico diario cargado exitosamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaService cargarDiaPorPunto"));
      return {
        success: false,
        data: null,
        message: "Error al cargar el pronóstico diario",
      };
    }
  };

  ejecutarIngesta = async (session) => {
    try {
      const resumen = await ejecutarIngestaClimaMapa(session);
      return {
        success: true,
        data: resumen,
        message: "Ingesta ejecutada exitosamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaService ejecutarIngesta"));
      return {
        success: false,
        data: null,
        message: "Error al ejecutar la ingesta",
      };
    }
  };

  // Reporte de sensación térmica (mín/media/máx diaria) por mercado, en un
  // Excel con una hoja por UCP. Fuente: datos_clima (p1_t..p24_t), que vive
  // en la BD unificada de jano-proxy — por eso el modelo de configuración
  // se usa directo, sin session, mientras que la lista de mercados del
  // tenant actual sí sale de su propia BD (con session).
  generarReporteSensacionTermica = async (session, { fechaInicio, fechaFin }) => {
    try {
      const ucpResult = await configuracionService.cargarUCP(2, 1, session);
      if (!ucpResult.success) {
        return {
          success: false,
          data: null,
          message: "No se pudo cargar la lista de mercados.",
        };
      }
      const mercados = [
        ...new Set(
          (ucpResult.data || []).map((r) => r.mc).filter(Boolean),
        ),
      ];
      if (mercados.length === 0) {
        return {
          success: false,
          data: null,
          message: "No hay mercados configurados para este usuario.",
        };
      }

      const datosPorMercado = {};
      for (const mc of mercados) {
        datosPorMercado[mc] =
          await configuracionModel.cargarVariablesClimaticasxFechaPeriodos(
            mc,
            fechaInicio,
            fechaFin,
          );
      }

      const buffer = await generarXlsxSensacionTermica(datosPorMercado);
      return {
        success: true,
        data: buffer,
        message: "Reporte generado exitosamente",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error ClimaMapaService generarReporteSensacionTermica"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al generar el reporte.",
      };
    }
  };
}
