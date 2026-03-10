import ConfiguracionModel from "../models/configuracion.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import { createConectionPG } from "../helpers/connections.js";

const model = ConfiguracionModel.getInstance();

export default class ConfiguracionService {
  static instance;

  static getInstance() {
    if (!ConfiguracionService.instance) {
      ConfiguracionService.instance = new ConfiguracionService();
    }
    return ConfiguracionService.instance;
  }

  buscarSaveDocumento = async (aux3, session) => {
    try {
      const client = createConectionPG(session);
      const documento = await model.buscarSaveDocumento(aux3, client);

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
        err,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener el documento.",
      };
    }
  };

  cargarDiasPotencia = async (ucp, session) => {
    try {
      const client = createConectionPG(session);
      const cargarDiasPotencia = await model.cargarDiasPotencias(ucp, client);
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
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener los datos de potencia.",
      };
    }
  };

  buscarVersionSesion = async (nombre, session) => {
    try {
      const client = createConectionPG(session);
      const buscarVersionSesion = await model.buscarVersionSesion(
        nombre,
        client,
      );
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
        colors.red("Error configuracionServices buscarVersionSesion"),
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener los datos de versiones de sesion",
      };
    }
  };

  agregarVersionSesion = async (datos, session) => {
    try {
      const client = createConectionPG(session);
      const versionSesion = await model.agregarVersionSesion(datos, client);
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
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al agregar la sesion",
      };
    }
  };

  agregarDatosPronosticoxSesion = async (datos, session) => {
    try {
      const client = createConectionPG(session);
      const datosPronosticoxSesion = await model.agregarDatosPronosticoxSesion(
        datos,
        client,
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
        colors.red(
          "Error configuracionServices agregarDatosPronosticosxSesion",
        ),
      );
      return {
        success: false,
        data: null,
        message: "Error al agregar datos pronostico por sesion",
      };
    }
  };

  buscarDiaFestivo = async (fecha, ucp, session) => {
    try {
      const client = createConectionPG(session);
      const festivos = await model.buscarDiaFestivo(fecha, ucp, client);

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
        err,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener el festivos.",
      };
    }
  };

  buscarPotenciaDia = async (ucp, dia, session) => {
    try {
      const client = createConectionPG(session);
      const diasPotencias = await model.buscarPotenciaDia(ucp, dia, client);

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

  cargarPeriodosxUCPDesdeFecha = async (ucp, fechaInicio, session) => {
    try {
      const client = createConectionPG(session);
      const res = await model.cargarPeriodosxUCPDesdeFecha(
        ucp,
        fechaInicio,
        client,
      );

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
        colors.red("Error configuracionServices cargarPeriodosxUCPDesdeFecha"),
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener los historicos",
      };
    }
  };

  cargarVariablesClimaticasxUCPDesdeFecha = async (
    ucp,
    fechaInicio,
    session,
  ) => {
    try {
      const client = createConectionPG(session);
      const res = await model.cargarVariablesClimaticasxUCPDesdeFecha(
        ucp,
        fechaInicio,
        client,
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
          "Error configuracionServices cargarVariablesClimaticasxUCPDesdeFecha",
        ),
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener las variables climaticas",
      };
    }
  };

  cargarPeriodosxUCPxUnaFechaxLimite = async (
    ucp,
    fechaInicio,
    limite,
    session,
  ) => {
    try {
      const client = createConectionPG(session);
      const res = await model.cargarPeriodosxUCPxUnaFechaxLimite(
        ucp,
        fechaInicio,
        limite,
        client,
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
          "Error configuracionServices cargarPeriodosxUCPxUnaFechaxLimite",
        ),
      );
      return {
        success: false,
        data: null,
        message: `Error al obtener los historicos de ${ucp}`,
      };
    }
  };

  cargarTodosLosDiasPotencia = async (session) => {
    try {
      const client = createConectionPG(session);
      const result = await model.cargarTodosLosDiasPotencia(client);
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
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener los datos de potencia.",
      };
    }
  };

  actualizarDiaPotencia = async (payload, session) => {
    try {
      const client = createConectionPG(session);
      const updated = await model.actualizarDiaPotencia(payload, client);
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
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al actualizar el día de potencia.",
      };
    }
  };

  crearDiaPotencia = async (payload, session) => {
    try {
      const client = createConectionPG(session);
      // payload ya validado por Joi en la ruta/middleware
      const created = await model.crearDiaPotencia(payload, client);
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
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al crear el día de potencia.",
      };
    }
  };
  // AGREGAR FUENTES
  agregarUCPMedida = async (payload, session) => {
    try {
      const client = createConectionPG(session);
      // payload debería venir validado por Joi en la ruta
      const created = await model.agregarUCPMedida(payload, client);
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
  cargarFuentes = async (session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.cargarFuentes(client);
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

  actualizarUCPMedida = async (payload, session) => {
    try {
      const client = createConectionPG(session);
      // payload validado por Joi en la ruta
      const updated = await model.actualizarUCPMedida(payload, client);
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

  eliminarUCPMedida = async (codigo, session) => {
    try {
      const client = createConectionPG(session);
      const deleted = await model.eliminarUCPMedida(codigo, client);
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

  cargarEquivalencias = async (session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.cargarEquivalencias(client);
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

  cargarUCP = async (codpadre = 0, estado = 1, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.cargarUCP(codpadre, estado, client);
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

  editarMercadoCascade = async (mc, mcnuevo, session) => {
    try {
      const client = createConectionPG(session);
      await model.editarMercadoCascade(mc, mcnuevo, client);
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

  cargarUmbral = async (codpadre = 79, estado = 1, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.cargarUmbral(codpadre, estado, client);
      return { success: true, data: rows, message: "Umbrales cargados." };
    } catch (error) {
      Logger.error(colors.red("Error UcpService cargarUmbral"), error);
      return {
        success: false,
        data: null,
        message: "Error al cargar umbrales.",
      };
    }
  };

  editarUmbral = async (codigo, aux2, session) => {
    try {
      const client = createConectionPG(session);
      const res = await model.editarUmbral(aux2, codigo, client);
      if (res.rowCount && res.rowCount > 0) {
        return { success: true, data: null, message: "Umbral actualizado." };
      } else {
        return {
          success: false,
          data: null,
          message: "No se actualizó ningún registro.",
        };
      }
    } catch (error) {
      Logger.error(colors.red("Error UcpService editarUmbral"), error);
      return {
        success: false,
        data: null,
        message: "Error al actualizar umbral.",
      };
    }
  };

  cargarDiasFestivos = async (anio, ucp, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.cargarDiasFestivos(anio, ucp, client);
      return { success: true, data: rows, message: "Festivos cargados." };
    } catch (error) {
      Logger.error(
        colors.red("Error FestivosService cargarDiasFestivos"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al cargar festivos.",
      };
    }
  };

  buscarDiaFestivo = async (fechaIso, ucp, session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.buscarDiaFestivo(fechaIso, ucp, client);
      return { success: true, data: row, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(colors.red("Error FestivosService buscarDiaFestivo"), error);
      return {
        success: false,
        data: null,
        message: "Error al buscar festivo.",
      };
    }
  };

  listarFestivosPorRango = async (fechaInicio, fechaFin, ucp, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.listarFestivosPorRango(
        fechaInicio,
        fechaFin,
        ucp,
        client,
      );
      return {
        success: true,
        data: rows,
        message: "Listado de festivos obtenido correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error FestivosService listarFestivosPorRango"),
        error,
      );
      return {
        success: false,
        data: [],
        message: "Error al listar festivos.",
      };
    }
  };

  ingresarDiaFestivos = async (ucp, fechaIso, session) => {
    try {
      const client = createConectionPG(session);
      const created = await model.ingresarDiaFestivos(ucp, fechaIso, client);
      return { success: true, data: created, message: "Festivo ingresado." };
    } catch (error) {
      Logger.error(
        colors.red("Error FestivosService ingresarDiaFestivos"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al ingresar festivo.",
      };
    }
  };

  borrarDiaFestivos = async (codigo, session) => {
    try {
      const client = createConectionPG(session);
      const deleted = await model.borrarDiaFestivos(codigo, client);
      if (deleted) {
        return { success: true, data: deleted, message: "Festivo eliminado." };
      } else {
        return {
          success: false,
          data: null,
          message: "No se encontró el registro.",
        };
      }
    } catch (error) {
      Logger.error(
        colors.red("Error FestivosService borrarDiaFestivos"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al eliminar festivo.",
      };
    }
  };

  buscarUltimaFechaHistorica = async (ucp, session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.buscarUltimaFechaHistorica(ucp, client);
      return { success: true, data: row, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService buscarUltimaFechaHistorica"),
        error,
      );
      return {
        success: false,
        data: null,
        message: `Error al buscar la ultima fecha historica del ucp ${ucp}.`,
      };
    }
  };

  buscarUltimaFechaClimaLog = async (session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.buscarUltimaFechaClimaLog(client);
      return { success: true, data: row, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService buscarUltimaFechaClimaLog"),
        error,
      );
      return {
        success: false,
        data: null,
        message: `Error al buscar el ultimo log fecha clima.`,
      };
    }
  };

  buscarKey = async (session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.buscarKey(client);
      return { success: true, data: row, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(colors.red("Error ActualizacionService buscarKey"), error);
      return {
        success: false,
        data: null,
        message: `Error al buscar la Key del clima.`,
      };
    }
  };

  buscarUltimaFechaClima = async (session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.buscarUltimaFechaClima(client);
      return { success: true, data: row, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService buscarUltimaFechaClima"),
        error,
      );
      return {
        success: false,
        data: null,
        message: `Error al buscar la ultima fecha clima.`,
      };
    }
  };

  buscarFactor = async (codigo, session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.buscarFactor(codigo, client);
      return { success: true, data: row, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService buscarFactor"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al buscar el factor.",
      };
    }
  };
  cargarCodigoRMPxUCP = async (codpadre, session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.cargarCodigoRMPxUCP(codpadre, client);
      return { success: true, data: row, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService cargarCodigoRMPxUCP"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al buscar el codigo RPM.",
      };
    }
  };
  cargarTipoArchivos = async (estado, aux2, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.cargarTipoArchivos(estado, aux2, client);
      return { success: true, data: rows, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService cargarTipoArchivos"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al buscar tipos de Archivos.",
      };
    }
  };

  cargarUCPxAux2 = async (aux2, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.cargarUCPxAux2(aux2, client);
      return { success: true, data: rows, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService cargarUCPxAux2"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al buscar tipos de UCP x Aux2.",
      };
    }
  };

  buscarUCPActualizacionDatos = async (ucp, fecha, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.buscarUCPActualizacionDatos(ucp, fecha, client);
      return { success: true, data: rows, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService buscarUCPActualizacionDatos"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al buscar UCP Actualizacion datos.",
      };
    }
  };

  verificarExisteActualizacionDatos = async (ucp, fecha, session) => {
    try {
      const client = createConectionPG(session);
      const existe = await model.verificarExisteActualizacionDatos(
        ucp,
        fecha,
        client,
      );
      return {
        success: true,
        data: { existe },
        message: existe ? "Registro existe." : "Registro no existe.",
      };
    } catch (error) {
      Logger.error(
        colors.red(
          "Error ActualizacionService verificarExisteActualizacionDatos",
        ),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al verificar existencia de datos de actualizacion.",
      };
    }
  };

  agregarUCPActualizacionDatos = async (datos, session) => {
    try {
      const client = createConectionPG(session);
      const result = await model.agregarUCPActualizacionDatos(datos, client);
      if (!result) {
        return {
          success: false,
          data: null,
          message: "No se pudieron agregar datos de actualizacion",
        };
      }

      return {
        success: true,
        data: result,
        message: "datos de actualizacion agregados exitosamente",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionServices agregarUCPActualizacionDatos"),
      );
      return {
        success: false,
        data: null,
        message: "Error al agregar datos de actualizacion",
      };
    }
  };

  actualizarUCPActualizacionDatos = async (datos, session) => {
    try {
      const client = createConectionPG(session);
      const result = await model.actualizarUCPActualizacionDatos(datos, client);
      if (!result) {
        return {
          success: false,
          data: null,
          message: "No se pudo actualizar los datos",
        };
      }

      return {
        success: true,
        data: result,
        message: "datos actualizados exitosamente",
      };
    } catch (error) {
      Logger.error(
        colors.red(
          "Error configuracionServices actualizarUCPActualizacionDatos",
        ),
      );
      return {
        success: false,
        data: null,
        message: "Error al actualizar los datos",
      };
    }
  };
  buscarClimaPeriodos = async (ucp, fecha, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.buscarClimaPeriodos(ucp, fecha, client);
      return { success: true, data: rows, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService buscarClimaPeriodos"),
        error,
      );
      return {
        success: false,
        data: null,
        message: `Error al buscar climas periodos.`,
      };
    }
  };

  agregarClimaPronosticoLog = async (fecha, ucp, session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.agregarClimaPronosticoLog(fecha, ucp, client);
      if (!row)
        return {
          success: false,
          data: null,
          message: "No se insertó el registro.",
        };
      return {
        success: true,
        data: row,
        message: "Registro agregado correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService agregarClimaPronosticoLog"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al agregar registro de log.",
      };
    }
  };

  agregarClimaPeriodo = async (fecha, ucp, indice, clima, valor, session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.agregarClimaPeriodo(
        fecha,
        ucp,
        indice,
        clima,
        valor,
        client,
      );
      if (!row)
        return {
          success: false,
          data: null,
          message: "No se insertó el periodo.",
        };
      return {
        success: true,
        data: row,
        message: "Periodo agregado correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService agregarClimaPeriodo"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al agregar periodo.",
      };
    }
  };

  actualizarClimaPeriodos = async (
    fecha,
    ucp,
    indice,
    clima,
    valor,
    session,
  ) => {
    try {
      const client = createConectionPG(session);
      const row = await model.actualizarClimaPeriodos(
        fecha,
        ucp,
        indice,
        clima,
        valor,
        client,
      );
      if (!row)
        return {
          success: false,
          data: null,
          message: "No se actualizó el periodo.",
        };
      return {
        success: true,
        data: row,
        message: "Periodo actualizado correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService actualizarClimaPeriodos"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al actualizar periodo.",
      };
    }
  };

  buscarTipicidad = async (ucp, fecha, session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.buscarTipicidad(ucp, fecha, client);
      return { success: true, data: row, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionService buscarTipicidad"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al buscar tipicidad.",
      };
    }
  };

  listarTipoModeloPorRango = async (fechaInicio, fechaFin, ucp, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.listarTipoModeloPorRango(
        fechaInicio,
        fechaFin,
        ucp,
        client,
      );
      return {
        success: true,
        data: rows,
        message: "Listado de fechas tipo modelos obtenidos correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error FestivosService listarTipoModeloPorRango"),
        error,
      );
      return {
        success: false,
        data: [],
        message: "Error al listar fechas tipos modelos.",
      };
    }
  };

  insertarTipoPronostico = async (ucp, fecha, tipopronostico, session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.insertarTipoPronostico(
        ucp,
        fecha,
        tipopronostico,
        client,
      );

      return {
        success: true,
        data: row,
        message: "Tipo de pronóstico ingresado correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error FechasTipoPronosticoService insertarTipoPronostico"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al ingresar tipo de pronóstico.",
      };
    }
  };

  cargarPeriodosDinamico = async (filters, session) => {
    try {
      const client = createConectionPG(session);
      const res = await model.cargarPeriodosDinamico(filters, client);

      if (!res) {
        return {
          success: false,
          data: null,
          message: "No se encontraron históricos",
        };
      }

      return {
        success: true,
        data: res,
        message: "Históricos encontrados",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionServices cargarPeriodosDinamico"),
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener históricos",
      };
    }
  };

  cargarHistoricosPronosticosDinamico = async (filters, session) => {
    try {
      const client = createConectionPG(session);
      const res = await model.cargarHistoricosPronosticosDinamico(
        filters,
        client,
      );

      if (!res) {
        return {
          success: false,
          data: null,
          message: "No se encontraron pronósticos históricos",
        };
      }

      return {
        success: true,
        data: res,
        message: "Pronósticos históricos encontrados",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error service cargarHistoricosPronosticosDinamico"),
      );
      return {
        success: false,
        data: null,
        message: "Error al cargar pronósticos históricos",
      };
    }
  };

  cargarPronosticosEHistoricos = async (filters, session) => {
    try {
      const client = createConectionPG(session);
      const res = await model.cargarPronosticosEHistoricos(filters, client);

      if (!res) {
        return {
          success: false,
          data: null,
          message: "No se encontraron datos",
        };
      }

      const pronosticos = res.filter((r) => r.tipo === "P");
      const historicos = res.filter((r) => r.tipo === "D");

      return {
        success: true,
        data: {
          pronosticos,
          historicos,
        },
        message: "Pronóstico e histórico cargados correctamente",
      };
    } catch (error) {
      Logger.error(colors.red("Error service cargarPronosticosEHistoricos"));
      return {
        success: false,
        data: null,
        message: "Error al cargar pronósticos e históricos",
      };
    }
  };

  listarTodosLosFestivos = async (ucp, session) => {
    try {
      const client = createConectionPG(session);
      const festivos = await model.listarTodosLosFestivos(ucp, client);
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
        colors.red("Error ConfiguracionService listarTodosLosFestivos"),
        err,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener el festivos.",
      };
    }
  };
}
