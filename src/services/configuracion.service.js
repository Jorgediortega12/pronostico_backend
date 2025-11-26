import ConfiguracionModel from "../models/configuracion.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

const model = ConfiguracionModel.getInstance();

export default class ConfiguracionService {
  static instance;

  static getInstance() {
    if (!ConfiguracionService.instance) {
      ConfiguracionService.instance = new ConfiguracionService();
    }
    return ConfiguracionService.instance;
  }

  buscarSaveDocumento = async (aux3) => {
    try {
      const documento = await model.buscarSaveDocumento(aux3);

      if (!documento) {
        return {
          success: false,
          data: null,
          message: "Documento no encontrado.",
        };
      }

      return {
        success: true,
        data: documento,
        message: "Documento obtenido correctamente.",
      };
    } catch (err) {
      Logger.error(
        colors.red("Error ConfiguracionService buscarSaveDocumento"),
        err
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener el documento.",
      };
    }
  };

  cargarDiasPotencia = async (ucp) => {
    try {
      const cargarDiasPotencia = await model.cargarDiasPotencias(ucp);
      if (!cargarDiasPotencia) {
        return {
          success: false,
          data: null,
          message: "No se encontraron datos de potencia.",
        };
      }
      return {
        success: true,
        data: cargarDiasPotencia,
        message: "Datos de potencia obtenidos correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error ConfiguracionService cargarDiasPotencia"),
        error
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener los datos de potencia.",
      };
    }
  };

  buscarVersionSesion = async (nombre) => {
    try {
      const buscarVersionSesion = await model.buscarVersionSesion(nombre);
      if (!buscarVersionSesion) {
        return {
          success: false,
          data: null,
          message: "No se encontraron datos para la version de la sesion",
        };
      }

      return {
        success: true,
        data: buscarVersionSesion,
        message: "Datos de version de sesion obtenidos correctamente",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionServices buscarVersionSesion")
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener los datos de versiones de sesion",
      };
    }
  };

  agregarVersionSesion = async (datos) => {
    try {
      const versionSesion = await model.agregarVersionSesion(datos);
      if (!versionSesion) {
        return {
          success: false,
          data: null,
          message: "No se pudo agregar la sesion",
        };
      }

      return {
        success: true,
        data: versionSesion,
        message: "La sesion fue agregada con exito",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionServices agregarVersionSesion"),
        error
      );
      return {
        success: false,
        data: null,
        message: "Error al agregar la sesion",
      };
    }
  };

  agregarDatosPronosticoxSesion = async (datos) => {
    try {
      const datosPronosticoxSesion = await model.agregarDatosPronosticoxSesion(
        datos
      );
      if (!datosPronosticoxSesion) {
        return {
          success: false,
          data: null,
          message: "No se pudieron agregar pronosticos por sesion",
        };
      }

      return {
        success: true,
        data: datosPronosticoxSesion,
        message: "agregar datos pronosticos por sesion agregado exitosamente",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionServices agregarDatosPronosticosxSesion")
      );
      return {
        success: false,
        data: null,
        message: "Error al agregar datos pronostico por sesion",
      };
    }
  };

  buscarDiaFestivo = async (fecha, ucp) => {
    try {
      const festivos = await model.buscarDiaFestivo(fecha, ucp);

      if (!festivos) {
        return {
          success: false,
          data: null,
          message: "festivos no encontrados.",
        };
      }

      return {
        success: true,
        data: festivos,
        message: "festivos obtenidos correctamente.",
      };
    } catch (err) {
      Logger.error(
        colors.red("Error ConfiguracionService buscarDiaFestivo"),
        err
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener el festivos.",
      };
    }
  };

  cargarDiasPotencias = async (ucp, dia) => {
    try {
      const diasPotencias = await model.cargarDiasPotencias(ucp, dia);

      if (!diasPotencias) {
        return {
          success: false,
          data: null,
          message: 'no se pudo cargar los dias de potencia'
        }
      }

      return {
        success: true,
        data: diasPotencias,
        message: 'Dias potencias cargados correctamente'
      }
    } catch (error) {
      Logger.error(colors.red("Error configuracionServices cargarDiasPotencias"));
      return {
        success: false,
        data: null,
        message: 'Error al obtener cargar dias potencia'
      }
    }
  }
}
