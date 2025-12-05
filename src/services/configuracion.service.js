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

  buscarPotenciaDia = async (ucp, dia) => {
    try {
      const diasPotencias = await model.buscarPotenciaDia(ucp, dia);

      if (!diasPotencias) {
        return {
          success: false,
          data: null,
          message: "no se pudo encontrar los dias de potencia",
        };
      }

      return {
        success: true,
        data: diasPotencias,
        message: "Dias potencias  entontrados",
      };
    } catch (error) {
      Logger.error(colors.red("Error configuracionServices buscarPotenciaDia"));
      return {
        success: false,
        data: null,
        message: "Error al obtener cargar dias potencia",
      };
    }
  };

  cargarPeriodosxUCPDesdeFecha = async (ucp, fechaInicio) => {
    try {
      const res = await model.cargarPeriodosxUCPDesdeFecha(ucp, fechaInicio);

      if (!res) {
        return {
          success: false,
          data: null,
          message: `no se pudo encontrar los historicos de ${ucp}`,
        };
      }

      return {
        success: true,
        data: res,
        message: `Historicos de ${ucp} entontrados`,
      };
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionServices cargarPeriodosxUCPDesdeFecha")
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener los historicos",
      };
    }
  };

  cargarVariablesClimaticasxUCPDesdeFecha = async (ucp, fechaInicio) => {
    try {
      const res = await model.cargarVariablesClimaticasxUCPDesdeFecha(
        ucp,
        fechaInicio
      );

      if (!res) {
        return {
          success: false,
          data: null,
          message: `no se pudo encontrar las variables climaticas de ${ucp}`,
        };
      }

      return {
        success: true,
        data: res,
        message: `las variables climaticas de ${ucp} entontradas`,
      };
    } catch (error) {
      Logger.error(
        colors.red(
          "Error configuracionServices cargarVariablesClimaticasxUCPDesdeFecha"
        )
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener las variables climaticas",
      };
    }
  };

  cargarPeriodosxUCPxUnaFechaxLimite = async (ucp, fechaInicio, limite) => {
    try {
      const res = await model.cargarPeriodosxUCPxUnaFechaxLimite(
        ucp,
        fechaInicio,
        limite
      );

      if (!res) {
        return {
          success: false,
          data: null,
          message: `no se pudo historicos de ${ucp}`,
        };
      }

      return {
        success: true,
        data: res,
        message: `historicos de ${ucp} entontradas`,
      };
    } catch (error) {
      Logger.error(
        colors.red(
          "Error configuracionServices cargarPeriodosxUCPxUnaFechaxLimite"
        )
      );
      return {
        success: false,
        data: null,
        message: `Error al obtener los historicos de ${ucp}`,
      };
    }
  };

  cargarTodosLosDiasPotencia = async () => {
    try {
      const result = await model.cargarTodosLosDiasPotencia();
      if (!result) {
        return {
          success: false,
          data: null,
          message: "No se encontraron datos de potencias.",
        };
      }
      return {
        success: true,
        data: result,
        message: "Datos de potencia obtenidos correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error ConfiguracionService cargarTodosLosDiasPotencia"),
        error
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener los datos de potencia.",
      };
    }
  };

  actualizarDiaPotencia = async (payload) => {
    try {
      const updated = await model.actualizarDiaPotencia(payload);
      if (!updated) {
        return {
          success: false,
          data: null,
          message:
            "No se encontró el registro o no se realizó ninguna actualización.",
        };
      }
      return {
        success: true,
        data: updated,
        message: "Día de potencia actualizado correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error ConfiguracionService actualizarDiaPotencia"),
        error
      );
      return {
        success: false,
        data: null,
        message: "Error al actualizar el día de potencia.",
      };
    }
  };

  crearDiaPotencia = async (payload) => {
    try {
      // payload ya validado por Joi en la ruta/middleware
      const created = await model.crearDiaPotencia(payload);
      if (!created) {
        return {
          success: false,
          data: null,
          message: "No se pudo crear el día de potencia.",
        };
      }
      return {
        success: true,
        data: created,
        message: "Día de potencia creado correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error ConfiguracionService crearDiaPotencia"),
        error
      );
      return {
        success: false,
        data: null,
        message: "Error al crear el día de potencia.",
      };
    }
  };
  // AGREGAR FUENTES
  agregarUCPMedida = async (payload) => {
    try {
      // payload debería venir validado por Joi en la ruta
      const created = await model.agregarUCPMedida(payload);
      if (!created) {
        return {
          success: false,
          data: null,
          message: "No se pudo crear la UCP.",
        };
      }
      return {
        success: true,
        data: created,
        message: "UCP creada correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error UCPService agregarUCPMedida"), error);
      // Podrías inspeccionar error.code para errores SQL (p. ej. duplicado) y devolver mensajes específicos
      return {
        success: false,
        data: null,
        message: "Error al crear la UCP.",
      };
    }
  };
  // CARGAR FUENTES
  cargarFuentes = async () => {
    try {
      const rows = await model.cargarFuentes();
      return {
        success: true,
        data: rows,
        message: "Fuentes obtenidas correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error UCPService cargarFuentes"), error);
      return {
        success: false,
        data: null,
        message: "Error al obtener las fuentes.",
      };
    }
  };

  actualizarUCPMedida = async (payload) => {
    try {
      // payload validado por Joi en la ruta
      const updated = await model.actualizarUCPMedida(payload);
      if (!updated) {
        return {
          success: false,
          data: null,
          message: "No se encontró la UCP o no se actualizó.",
        };
      }
      return {
        success: true,
        data: updated,
        message: "UCP actualizada correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error UCPService actualizarUCPMedida"), error);
      // manejar errores SQL concretos si quieres
      return {
        success: false,
        data: null,
        message: "Error al actualizar la UCP.",
      };
    }
  };

  eliminarUCPMedida = async (codigo) => {
    try {
      const deleted = await model.eliminarUCPMedida(codigo);
      if (!deleted) {
        return {
          success: false,
          data: null,
          message: "No se encontró la UCP a eliminar.",
        };
      }
      return {
        success: true,
        data: deleted,
        message: "UCP eliminada correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error UCPService eliminarUCPMedida"), error);
      return {
        success: false,
        data: null,
        message: "Error al eliminar la UCP.",
      };
    }
  };

  cargarEquivalencias = async () => {
    try {
      const rows = await model.cargarEquivalencias();
      return {
        success: true,
        data: rows,
        message: "Equivalencias obtenidas correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error UCPService cargarEquivalencias"), error);
      return {
        success: false,
        data: null,
        message: "Error al obtener las equivalencias.",
      };
    }
  };

  cargarUCP = async (codpadre = 0, estado = 1) => {
    try {
      const rows = await model.cargarUCP(codpadre, estado);
      return {
        success: true,
        data: rows,
        message: "UCPs cargadas correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error UcpService cargarUCP"), error);
      return {
        success: false,
        data: null,
        message: "Error al cargar UCPs.",
      };
    }
  };

  editarMercadoCascade = async (mc, mcnuevo) => {
    try {
      await model.editarMercadoCascade(mc, mcnuevo);
      return {
        success: true,
        data: null,
        message: "Mercado actualizado correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error UcpService editarMercadoCascade"), error);
      return {
        success: false,
        data: null,
        message: "Error al actualizar el mercado.",
      };
    }
  };
}
