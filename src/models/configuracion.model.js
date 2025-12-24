import * as querys from "../querys/configuracion.query.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

export default class ConfiguracionModel {
  static instance;

  static getInstance() {
    if (!ConfiguracionModel.instance) {
      ConfiguracionModel.instance = new ConfiguracionModel();
    }
    return ConfiguracionModel.instance;
  }

  createClient() {
    return new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST || "localhost",
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: process.env.POSTGRES_PORT || 5432,
    });
  }

  buscarSaveDocumento = async (aux3) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarSaveDocumento, [aux3]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ConfiguracionModel buscarSaveDocumento"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarDiasPotencias = async (ucp) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarDiasPotencia, [ucp]);
      return result.rows;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel cargarDiasPotencias"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  buscarVersionSesion = async (nombre) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarVersionSesion, [nombre]);
      console.log("result buscarVersionSesion:", result);
      return result.rows;
    } catch (error) {
      Logger.error(colors.red("Error configuracionModel bsucarVersionSesion"));
      throw error;
    } finally {
      await client.end();
    }
  };

  agregarVersionSesion = async (datos) => {
    const client = this.createClient();
    console.log("datos en model agregarVersionSesion:", datos);
    try {
      await client.connect();
      const valores = [
        datos.fecha,
        datos.ucp,
        datos.fechainicio,
        datos.fechafin,
        datos.tipodatos,
        datos.tendencia,
        datos.dias,
        datos.edicionfiltro,
        datos.edicionperiodo,
        datos.ediciontexto,
        datos.edicionfecha,
        datos.edicionsuma,
        datos.nombre,
        datos.version,
        datos.usuario,
        datos.p1_diario,
        datos.p2_diario,
        datos.p3_diario,
        datos.p4_diario,
        datos.p5_diario,
        datos.p6_diario,
        datos.p7_diario,
        datos.p8_diario,
        datos.p9_diario,
        datos.p10_diario,
        datos.p11_diario,
        datos.p12_diario,
        datos.p13_diario,
        datos.p14_diario,
        datos.p15_diario,
        datos.p16_diario,
        datos.p17_diario,
        datos.p18_diario,
        datos.p19_diario,
        datos.p20_diario,
        datos.p21_diario,
        datos.p22_diario,
        datos.p23_diario,
        datos.p24_diario,
        datos.nombrearchivo,
        datos.cargaindustrial,
      ];
      const result = await client.query(querys.agregarVersionSesion, valores);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel agregarVersionSesion"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  agregarDatosPronosticoxSesion = async (datos) => {
    const client = this.createClient();
    try {
      await client.connect();
      const valores = [
        datos.codsesion,
        datos.check_f,
        datos.fecha,
        datos.p1,
        datos.p2,
        datos.p3,
        datos.p4,
        datos.p5,
        datos.p6,
        datos.p7,
        datos.p8,
        datos.p9,
        datos.p10,
        datos.p11,
        datos.p12,
        datos.p13,
        datos.p14,
        datos.p15,
        datos.p16,
        datos.p17,
        datos.p18,
        datos.p19,
        datos.p20,
        datos.p21,
        datos.p22,
        datos.p23,
        datos.p24,
        datos.observacion,
        datos.tipo,
      ];
      const result = await client.query(
        querys.agregarDatosPronosticoxSesion,
        valores
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel agregarDatosPronosticoxSesion"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };
  buscarDiaFestivo = async (fecha, ucp) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarDiaFestivo, [fecha, ucp]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ConfiguracionModel buscarDiaFestivo"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };
  buscarPotenciaDia = async (ucp, dia) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarPotenciaDia, [ucp, dia]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(colors.red("Error configuracionModel buscarPotenciaDia"));
      throw error;
    } finally {
      await client.end();
    }
  };
  cargarPeriodosxUCPDesdeFecha = async (ucp, fechaInicio) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarPeriodosxUCPDesdeFecha, [
        ucp,
        fechaInicio,
      ]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel cargarPeriodosxUCPDesdeFecha")
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarVariablesClimaticasxUCPDesdeFecha = async (ucp, fechaInicio) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(
        querys.cargarVariablesClimaticasxUCPDesdeFecha,
        [ucp, fechaInicio]
      );
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red(
          "Error configuracionModel cargarVariablesClimaticasxUCPDesdeFecha"
        )
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarPeriodosxUCPxUnaFechaxLimite = async (ucp, fechaInicio, limite) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(
        querys.cargarPeriodosxUCPxUnaFechaxLimite,
        [ucp, fechaInicio, limite]
      );
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red(
          "Error configuracionModel cargarPeriodosxUCPxUnaFechaxLimite"
        )
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarTodosLosDiasPotencia = async () => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarTodosLosDiasPotencia);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel cargarTodosLosDiasPotencia"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  actualizarDiaPotencia = async ({
    codigo,
    dia,
    potencia1,
    potencia2,
    potencia3,
    potencia4,
    potencia5,
    potencia6,
    potencia7,
    ucp,
  }) => {
    const client = this.createClient();
    try {
      await client.connect();
      const params = [
        dia,
        potencia1,
        potencia2,
        potencia3,
        potencia4,
        potencia5,
        potencia6,
        potencia7,
        ucp,
        codigo,
      ];
      const result = await client.query(querys.actualizarDiaPotencia, params);
      // si usas RETURNING * devolverá el row actualizado
      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel actualizarDiaPotencia"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  // importar querys, Logger, colors según tu proyecto
  crearDiaPotencia = async ({
    dia,
    potencia1,
    potencia2,
    potencia3,
    potencia4,
    potencia5,
    potencia6,
    potencia7,
    ucp,
  }) => {
    const client = this.createClient();
    try {
      await client.connect();
      const params = [
        dia,
        potencia1,
        potencia2,
        potencia3,
        potencia4,
        potencia5,
        potencia6,
        potencia7,
        ucp,
      ];
      const result = await client.query(querys.crearDiaPotencia, params);
      // Devolver el registro creado (RETURNING *)
      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel crearDiaPotencia"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  // AGREGAR FUENTES
  agregarUCPMedida = async ({
    nombre,
    factor,
    codigo_rpm,
    codpadre,
    estado,
    aux,
    aux2,
    aux3,
    aux4,
  }) => {
    const client = this.createClient();
    try {
      await client.connect();
      const params = [
        nombre,
        factor,
        codigo_rpm,
        codpadre,
        estado,
        aux,
        aux2,
        aux3,
        aux4,
      ];
      const result = await client.query(querys.agregarUCPMedida, params);
      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(colors.red("Error ucpModel agregarUCPMedida"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  // CARGAR FUENTES
  cargarFuentes = async () => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarFuentes);
      return result.rows && result.rows.length > 0 ? result.rows : [];
    } catch (error) {
      Logger.error(colors.red("Error ucpModel cargarFuentes"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  // actualizarUCPMedida
  actualizarUCPMedida = async ({
    codigo,
    nombre,
    factor,
    codigo_rpm,
    codpadre,
    estado,
    aux,
    aux2,
    aux3,
    aux4,
  }) => {
    const client = this.createClient();
    try {
      await client.connect();
      const params = [
        nombre,
        factor,
        codigo_rpm,
        codpadre,
        estado,
        aux,
        aux2,
        aux3,
        aux4,
        codigo,
      ];
      const result = await client.query(querys.actualizarUCPMedida, params);
      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(colors.red("Error ucpModel actualizarUCPMedida"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  // eliminarUCPMedida
  eliminarUCPMedida = async (codigo) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.eliminarUCPMedida, [codigo]);
      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(colors.red("Error ucpModel eliminarUCPMedida"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  // Dentro de tu model (por ejemplo ucpModel)
  cargarEquivalencias = async () => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarEquivalencias);
      // devolvemos siempre un array (vacío si no hay filas)
      return result.rows && result.rows.length > 0 ? result.rows : [];
    } catch (error) {
      Logger.error(colors.red("Error ucpModel cargarEquivalencias"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  // cargarUCP: retorna array de strings [{ mc: 'Atlantico' }, ...]
  async cargarUCP(codpadre = 0, estado = 1) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.cargarUCP, [codpadre, estado]);
      return res.rows;
    } catch (error) {
      Logger.error(colors.red("Error ucpModel cargarUCP"), error);
      throw error;
    } finally {
      await client.end();
    }
  }

  // editarMercadoCascade: ejecuta todas las updates en transacción
  // input: mc (viejo nombre), mcnuevo (nuevo nombre)
  async editarMercadoCascade(mc, mcnuevo) {
    const client = this.createClient();
    try {
      await client.connect();
      await client.query("BEGIN");

      const q = querys.editarMercadoCascadeQueries;

      // Ejecutar cada update en orden. Usamos same params ($1=mc, $2=mcnuevo)
      await client.query(q.editarMercadoNombre, [mc, mcnuevo]);
      await client.query(q.editarMercadoAux2, [mc, mcnuevo]);
      await client.query(q.editarMercadoAux3, [mc, mcnuevo]);
      await client.query(q.editarMercadoBarras, [mc, mcnuevo]);
      await client.query(q.editarMercadoDatosClima, [mc, mcnuevo]);
      await client.query(q.editarMercadoDatosClimaLog, [mc, mcnuevo]);
      await client.query(q.editarMercadoDatosPotencias, [mc, mcnuevo]);
      await client.query(q.editarMercadoFechasIngresadas, [mc, mcnuevo]);
      await client.query(q.editarMercadoFechasTipoPronosticos, [mc, mcnuevo]);
      await client.query(q.editarMercadoFestivos, [mc, mcnuevo]);
      await client.query(q.editarMercadoObservaciones, [mc, mcnuevo]);
      await client.query(q.editarMercadoPronostico, [mc, mcnuevo]);
      await client.query(q.editarMercadoSesiones, [mc, mcnuevo]);
      await client.query(q.editarMercadoActualizacionDatos, [mc, mcnuevo]);

      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      Logger.error(colors.red("Error ucpModel editarMercadoCascade"), error);
      throw error;
    } finally {
      await client.end();
    }
  }
  // Cargar umbrales (codpadre=79, estado=1)
  async cargarUmbral(codpadre = 79, estado = 1) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.cargarUmbral, [codpadre, estado]);
      return res.rows;
    } catch (error) {
      Logger.error(colors.red("Error ucpModel cargarUmbral"), error);
      throw error;
    } finally {
      await client.end();
    }
  }

  // Editar umbral: aux2 + codigo
  async editarUmbral(aux2, codigo) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.editarUmbral, [aux2, codigo]);
      // res.rowCount nos dice si se actualizó
      return { rowCount: res.rowCount };
    } catch (error) {
      Logger.error(colors.red("Error ucpModel editarUmbral"), error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async cargarDiasFestivos(anio, ucp) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.cargarDiasFestivos, [anio, ucp]);
      return res.rows;
    } catch (error) {
      Logger.error(colors.red("Error FestivosModel cargarDiasFestivos"), error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async buscarDiaFestivo(fechaIso, ucp) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.buscarDiaFestivo, [fechaIso, ucp]);
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (error) {
      Logger.error(colors.red("Error FestivosModel buscarDiaFestivo"), error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async ingresarDiaFestivos(ucp, fechaIso) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.ingresarDiaFestivos, [
        ucp,
        fechaIso,
      ]);
      return res.rows[0];
    } catch (error) {
      Logger.error(
        colors.red("Error FestivosModel ingresarDiaFestivos"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async borrarDiaFestivos(codigo) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.borrarDiaFestivos, [codigo]);
      return res.rows[0] || null;
    } catch (error) {
      Logger.error(colors.red("Error FestivosModel borrarDiaFestivos"), error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async buscarUltimaFechaHistorica(ucp) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.buscarUltimaFechaHistorica, [ucp]);
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel buscarUltimaFechaHistorica"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async buscarUltimaFechaClimaLog() {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.buscarUltimaFechaClimaLog);
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel buscarUltimaFechaClimaLog"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async buscarUltimaFechaClima() {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.buscarUltimaFechaClima);
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel buscarUltimaFechaClima"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async buscarKey() {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.buscarKey);
      return res.rows.length > 0 ? res.rows[0].aux : null;
    } catch (error) {
      Logger.error(colors.red("Error ActualizacionModel buscarKey"), error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async buscarFactor(codigo) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.buscarFactor, [codigo]);
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (error) {
      Logger.error(colors.red("Error ActualizacionModel buscarFactor"), error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async cargarCodigoRMPxUCP(codpadre) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.cargarCodigoRMPxUCP, [codpadre]);
      return res.rows.length > 0 ? res.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel cargarCodigoRMPxUCP"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async cargarTipoArchivos(estado, aux2) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.cargarTipoArchivos, [estado, aux2]);
      return res.rows.length > 0 ? res.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel cargarTipoArchivos"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async cargarUCPxAux2(aux2) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.cargarUCPxAux2, [aux2]);
      return res.rows.length > 0 ? res.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel cargarUCPxAux2"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async buscarUCPActualizacionDatos(ucp, fecha) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.buscarUCPActualizacionDatos, [
        ucp,
        fecha,
      ]);
      return res.rows.length > 0 ? res.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel buscarUCPActualizacionDatos"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  agregarUCPActualizacionDatos = async (datos) => {
    const client = this.createClient();
    console.log("datos:", datos)
    try {
      await client.connect();
      const valores = [
        datos.ucp,
        datos.fecha,
        datos.observacion,
        datos.p1,
        datos.p2,
        datos.p3,
        datos.p4,
        datos.p5,
        datos.p6,
        datos.p7,
        datos.p8,
        datos.p9,
        datos.p10,
        datos.p11,
        datos.p12,
        datos.p13,
        datos.p14,
        datos.p15,
        datos.p16,
        datos.p17,
        datos.p18,
        datos.p19,
        datos.p20,
        datos.p21,
        datos.p22,
        datos.p23,
        datos.p24,
        datos.estado,
        datos.festivo,
      ];
      const result = await client.query(
        querys.agregarUCPActualizacionDatos,
        valores
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel agregarUCPActualizacionDatos"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  actualizarUCPActualizacionDatos = async (datos) => {
    const client = this.createClient();
    try {
      await client.connect();
      const valores = [
        datos.p1,
        datos.p2,
        datos.p3,
        datos.p4,
        datos.p5,
        datos.p6,
        datos.p7,
        datos.p8,
        datos.p9,
        datos.p10,
        datos.p11,
        datos.p12,
        datos.p13,
        datos.p14,
        datos.p15,
        datos.p16,
        datos.p17,
        datos.p18,
        datos.p19,
        datos.p20,
        datos.p21,
        datos.p22,
        datos.p23,
        datos.p24,
        datos.estado,
        datos.observacion,
        datos.ucp,
        datos.fecha,
      ];
      const result = await client.query(
        querys.actualizarUCPActualizacionDatos,
        valores
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel actualizarUCPActualizacionDatos"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  async buscarClimaPeriodos(ucp, fecha) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.buscarClimaPeriodos, [ucp, fecha]);
      return res.rows.length > 0 ? res.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel buscarClimaPeriodos"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async agregarClimaPronosticoLog(fecha, ucp) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.agregarClimaPronosticoLog, [
        fecha,
        ucp,
      ]);
      // Si quieres sólo true/false podrías devolver res.rowCount > 0
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel agregarClimaPronosticoLog"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async agregarClimaPeriodo(fecha, ucp, indice, clima, valor) {
    const client = this.createClient();
    try {
      await client.connect();

      // VALIDAR antes de construir la columna:
      // - indice es integer y está en rango permitido (ej: 1..10)
      // - clima pertenece a lista blanca (ej: ['temp','precip','viento',...])
      // Si no validas, corres riesgo de SQL injection.
      const column = `p${parseInt(indice, 10)}_${clima}`;

      const sql = `INSERT INTO datos_clima (fecha, ucp, ${column})
                 VALUES ($1, $2, $3)
                 RETURNING *;`;

      const res = await client.query(sql, [fecha, ucp, valor]);
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel agregarClimaPeriodo"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async actualizarClimaPeriodos(fecha, ucp, indice, clima, valor) {
    const client = this.createClient();
    try {
      await client.connect();
      const column = `p${parseInt(indice, 10)}_${clima}`;

      const sql = `UPDATE datos_clima
                 SET ${column} = $1
                 WHERE fecha = $2 AND ucp = $3
                 RETURNING *;`;

      const res = await client.query(sql, [valor, fecha, ucp]);
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel actualizarClimaPeriodos"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async buscarTipicidad(ucp, fecha) {
    const client = this.createClient();
    try {
      await client.connect();
      const res = await client.query(querys.buscarTipicidad, [ucp, fecha]);
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ActualizacionModel buscarTipicidad"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }
}
