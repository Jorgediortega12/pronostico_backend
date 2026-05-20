import * as querys from "../querys/factores.querys.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

export default class FactoresModel {
  static instance;

  static getInstance() {
    if (!FactoresModel.instance) {
      FactoresModel.instance = new FactoresModel();
    }
    return FactoresModel.instance;
  }

  guardarBarra = async (data, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.guardarBarra, [
        data.barra,
        data.descripcion,
        data.nivel_tension,
        data.observaciones,
        data.habilitar,
        data.mc,
      ]);
      return result.rows[0];
    } catch (error) {
      Logger.error(colors.red("Error FactoresModel guardarBarra"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  consultarBarrasIndex_xMC = async (mc, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.consultarBarrasIndex_xMC, [mc]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error FactoresModel consultarBarrasIndex_xMC"),
        error,
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  actualizarBarra = async (id, data, client) => {
    try {
      await client.connect();
      await client.query(querys.actualizarBarra, [
        data.barra,
        data.descripcion,
        data.nivel_tension,
        data.observaciones,
        data.habilitar,
        data.mc,
        id,
      ]);
      return true;
    } catch (error) {
      Logger.error(colors.red("Error FactoresModel actualizarBarra"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  guardarAgrupacion = async (data, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.guardarAgrupacion, [
        data.barra_id,
        data.codigo_rpm,
        data.flujo,
        data.habilitar,
        data.revision,
        data.factor,
      ]);
      return result.rows[0];
    } finally {
      await client.end();
    }
  };

  // En FactoresModel
  consultarAgrupacion_xCodigoRpm = async (codigoRpm, client) => {
    try {
      await client.connect();
      const { rows } = await client.query(
        querys.consultarAgrupacion_xCodigoRpm,
        [codigoRpm],
      );
      return rows[0] ?? null;
    } catch (error) {
      Logger.error(
        colors.red("Error FactoresModel consultarAgrupacionesIndex_xBarraId"),
        error,
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  consultarAgrupacionesIndex_xBarraId = async (barra_id, client) => {
    try {
      await client.connect();
      const result = await client.query(
        querys.consultarAgrupacionesIndex_xBarraId,
        [barra_id],
      );
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error FactoresModel consultarAgrupacionesIndex_xBarraId"),
        error,
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  actualizarAgrupacion = async (id, data, client) => {
    try {
      await client.connect();
      await client.query(querys.actualizarAgrupacion, [
        data.barra_id,
        data.codigo_rpm,
        data.flujo,
        data.habilitar,
        data.revision,
        data.factor,
        id,
      ]);
      return true;
    } finally {
      await client.end();
    }
  };

  eliminarBarraConAgrupaciones = async (id, client) => {
    try {
      await client.connect();
      await client.query("BEGIN");

      // 1️⃣ Eliminar agrupaciones hijas
      await client.query(querys.eliminarAgrupacionesPorBarra, [id]);

      // 2️⃣ Eliminar barra
      await client.query(querys.eliminarBarra, [id]);

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
  };

  eliminarAgrupacion = async (id, client) => {
    try {
      await client.connect();
      await client.query(querys.eliminarAgrupacion, [id]);
      return true;
    } finally {
      await client.end();
    }
  };

  eliminarMedidasRapido = async (medidas, client) => {
    try {
      await client.connect();
      await client.query("BEGIN");

      for (const m of medidas) {
        await client.query(querys.eliminarMedida, [
          m.flujo,
          m.fecha,
          m.codigo_rpm,
        ]);
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      Logger.error(
        colors.red("Error MedidasModel eliminarMedidasRapido"),
        error,
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  actualizarMedidasRapido = async (medidas, client) => {
    try {
      await client.connect();
      await client.query("BEGIN");

      for (const m of medidas) {
        await client.query(querys.actualizarMedida, [
          m.flujo,
          m.fecha,
          m.codigo_rpm,
          m.p1,
          m.p2,
          m.p3,
          m.p4,
          m.p5,
          m.p6,
          m.p7,
          m.p8,
          m.p9,
          m.p10,
          m.p11,
          m.p12,
          m.p13,
          m.p14,
          m.p15,
          m.p16,
          m.p17,
          m.p18,
          m.p19,
          m.p20,
          m.p21,
          m.p22,
          m.p23,
          m.p24,
        ]);
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      Logger.error(
        colors.red("Error MedidasModel actualizarMedidasRapido"),
        error,
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  insertarMedidasRapido = async (medidas, client) => {
    try {
      await client.connect();
      await client.query("BEGIN");

      for (const m of medidas) {
        await client.query(querys.insertarMedida, [
          m.flujo,
          m.fecha,
          m.codigo_rpm,
          m.p1,
          m.p2,
          m.p3,
          m.p4,
          m.p5,
          m.p6,
          m.p7,
          m.p8,
          m.p9,
          m.p10,
          m.p11,
          m.p12,
          m.p13,
          m.p14,
          m.p15,
          m.p16,
          m.p17,
          m.p18,
          m.p19,
          m.p20,
          m.p21,
          m.p22,
          m.p23,
          m.p24,
        ]);
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      Logger.error(
        colors.red("Error MedidasModel insertarMedidasRapido"),
        error,
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  // InsersarmedidasEPM
  procesarYInsertarMedidasEPM = async (datosEPM, barraId, client) => {
    try {
      // 1. Consultar agrupaciones por barra_id
      const { rows: agrupaciones } = await client.query(
        querys.consultarAgrupacionesIndex_xBarraId,
        [barraId],
      );

      // Mapa rápido: codigo_rpm -> flujo
      const mapaAgrupaciones = new Map(
        agrupaciones.map((a) => [a.codigo_rpm, a.flujo]),
      );

      // 2. Agrupar datos EPM por (codigo_rpm, fecha_dia)
      const grupos = new Map();

      for (const item of datosEPM) {
        const codigoRpm = construirCodigoRpm(
          item.ESTACION,
          item.NIVEL_TENSION,
          item.CAMPO,
        );

        const fechaCompleta = new Date(item.FECHA);
        const fechaDia = fechaCompleta.toISOString().split("T")[0]; // "2026-04-20"
        const hora = fechaCompleta.getUTCHours(); // 0-23
        const periodo = hora + 1; // p1-p24

        // Determinar flujo
        const flujo = mapaAgrupaciones.has(codigoRpm)
          ? mapaAgrupaciones.get(codigoRpm)
          : mapearFlujo(item.NOMBRE);

        const key = `${codigoRpm}||${fechaDia}||${flujo}`;

        if (!grupos.has(key)) {
          grupos.set(key, {
            flujo,
            fecha: fechaDia,
            codigo_rpm: codigoRpm,
            p1: null,
            p2: null,
            p3: null,
            p4: null,
            p5: null,
            p6: null,
            p7: null,
            p8: null,
            p9: null,
            p10: null,
            p11: null,
            p12: null,
            p13: null,
            p14: null,
            p15: null,
            p16: null,
            p17: null,
            p18: null,
            p19: null,
            p20: null,
            p21: null,
            p22: null,
            p23: null,
            p24: null,
          });
        }

        // Asignar INTEGRAL al periodo correspondiente
        const medida = grupos.get(key);
        medida[`p${periodo}`] = item.INTEGRAL;
      }

      // 3. Insertar medidas
      await client.query("BEGIN");

      for (const medida of grupos.values()) {
        await client.query(querys.insertarMedida, [
          medida.flujo,
          medida.fecha,
          medida.codigo_rpm,
          medida.p1,
          medida.p2,
          medida.p3,
          medida.p4,
          medida.p5,
          medida.p6,
          medida.p7,
          medida.p8,
          medida.p9,
          medida.p10,
          medida.p11,
          medida.p12,
          medida.p13,
          medida.p14,
          medida.p15,
          medida.p16,
          medida.p17,
          medida.p18,
          medida.p19,
          medida.p20,
          medida.p21,
          medida.p22,
          medida.p23,
          medida.p24,
        ]);
      }

      await client.query("COMMIT");
      return { insertadas: grupos.size };
    } catch (error) {
      await client.query("ROLLBACK");
      Logger.error(colors.red("Error procesarYInsertarMedidasEPM"), error);
      throw error;
    }
  };

  /* =========================
     FECHAS INGRESADAS
     ========================= */

  eliminarFechasIngresadasTodos = async (ucp, client) => {
    try {
      await client.connect();
      await client.query(querys.eliminarFechasIngresadasTodos, [ucp]);
      return true;
    } catch (error) {
      Logger.error(colors.red("Error eliminarFechasIngresadasTodos"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  guardarRangoFecha = async (data, client) => {
    try {
      await client.connect();
      await client.query(querys.guardarRangoFecha, [
        data.fechaInicio,
        data.fechaFinal,
        data.ucp,
        data.barra,
        data.tipo_dia,
        data.nro_dias,
      ]);
      return true;
    } catch (error) {
      Logger.error(colors.red("Error guardarRangoFecha"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  /* =========================
     MEDIDAS
     ========================= */

  reiniciarMedidas = async (client) => {
    try {
      await client.connect();
      await client.query(querys.reiniciarMedidas);
      return true;
    } catch (error) {
      Logger.error(colors.red("Error reiniciarMedidas"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  /* =========================
     CONSULTAS
     ========================= */

  consultarBarraNombre = async (barra, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.consultarBarraNombre, [barra]);
      return result.rows;
    } catch (error) {
      Logger.error(colors.red("Error consultarBarraNombre"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  consultarBarraFlujoNombreInicial = async (barra, tipo, client) => {
    try {
      await client.connect();
      const result = await client.query(
        querys.consultarBarraFlujoNombreInicial,
        [barra, tipo],
      );
      return result.rows;
    } catch (error) {
      Logger.error(colors.red("Error consultarBarraFlujoNombreInicial"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  consultarBarraFactorNombre = async (barra, tipo, codigosRPM, client) => {
    try {
      await client.connect();

      const result = await client.query(querys.consultarBarraFactorNombre, [
        barra,
        codigosRPM,
        tipo,
      ]);

      return result.rows;
    } catch (error) {
      Logger.error(colors.red("Error consultarBarraFactorNombre"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  consultarMedidasCalcularCompleto = async (params, client) => {
    const {
      fecha_inicial,
      fecha_final,
      codigo_rpm,
      flujo,
      tipo_dia,
      mc,
      barra,
      marcado = false,
    } = params;

    const marcadoBool = Boolean(marcado);

    try {
      await client.connect();
      const result = await client.query(
        querys.consultarMedidasCalcularCompleto,
        [
          fecha_inicial,
          fecha_final,
          codigo_rpm, // array
          flujo, // array
          tipo_dia,
          mc,
          barra,
          marcadoBool,
        ],
      );

      return result.rows;
    } catch (error) {
      Logger.error(colors.red("Error consultarMedidasCalcularCompleto"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  async buscarUltimaFechaMedida(client) {
    try {
      await client.connect();
      const result = await client.query(querys.buscarUltimaFechaMedida);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(colors.red("Error buscarUltimaFechaMedida"), error);
      throw error;
    } finally {
      await client.end();
    }
  }

  buscarVersionSesionFactores = async (nombre, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.buscarVersionSesionFactores, [
        nombre,
      ]);
      return result.rows;
    } catch (error) {
      Logger.error(colors.red("Error buscarVersionSesionFactores"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  agregarSesionFactores = async (datos, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.agregarSesionFactores, [
        datos.fecha,
        datos.ucp,
        datos.fecha_inicio,
        datos.fecha_fin,
        datos.usuario,
        datos.nombre,
        datos.version,
        datos.nombrearchivo,
        datos.observacion ?? "",
      ]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(colors.red("Error agregarSesionFactores"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  agregarRefFactores = async (datos, client) => {
    try {
      await client.connect();
      const ps = Array.from({ length: 24 }, (_, i) => datos[`p${i + 1}`] ?? 0);
      const result = await client.query(querys.agregarRefFactores, [
        datos.codsesion,
        datos.tipo_dia,
        datos.tipo_energia,
        ...ps,
      ]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(colors.red("Error agregarRefFactores"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  agregarFactorSesion = async (datos, client) => {
    try {
      await client.connect();
      const ps = Array.from({ length: 24 }, (_, i) => datos[`p${i + 1}`] ?? 0);
      const result = await client.query(querys.agregarFactorSesion, [
        datos.codsesion,
        datos.tipo_dia,
        datos.tipo_factor,
        datos.barra,
        ...ps,
      ]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(colors.red("Error agregarFactorSesion"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  agregarArchivoSesionFactores = async (datos, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.agregarArchivoSesionFactores, [
        datos.codsesion,
        datos.codarchivo,
        datos.tipo ?? "xlsx",
      ]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(colors.red("Error agregarArchivoSesionFactores"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  buscarSesionPorArchivo = async (codArchivo, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.buscarSesionPorArchivo, [
        codArchivo,
      ]);
      console.log("codArchivo:", codArchivo);
      console.log("RESULTsESSION MODEL:", JSON.stringify(result, null, 5));

      return result.rows;
    } catch (err) {
      throw err;
    } finally {
      await client.end();
    }
  };

  buscarRefPorSesion = async (codsesion, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.buscarRefPorSesion, [codsesion]);
      return result.rows;
    } catch (err) {
      throw err;
    } finally {
      await client.end();
    }
  };

  buscarFactoresPorSesion = async (codsesion, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.buscarFactoresPorSesion, [
        codsesion,
      ]);
      return result.rows;
    } catch (err) {
      throw err;
    } finally {
      await client.end();
    }
  };
  cargarArchivoVrSesionesFactores = async (codcarpeta, client) => {
    try {
      await client.connect();
      const result = await client.query(
        querys.cargarArchivoVrSesionesFactores,
        [codcarpeta],
      );
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error FactoresModel cargarArchivoVrSesionesFactores"),
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  getUltimaSesionFactoresPorUcp = async (ucp, client) => {
    try {
      await client.connect();

      // 1. Cabecera de la sesión más reciente
      const resSesion = await client.query(querys.getUltimaSesionPorUcp, [ucp]);

      if (!resSesion.rows.length) return null;
      const sesion = resSesion.rows[0];

      // 2. Factores FDA/FDP de esa sesión
      const resFactores = await client.query(querys.getFactoresPorSesion, [
        sesion.codigo,
      ]);

      return { sesion, factores: resFactores.rows };
    } catch (error) {
      Logger.error("Error getUltimaSesionFactoresPorUcp", error);
      throw error;
    } finally {
      await client.end();
    }
  };

  getSessionVigentePorUcp = async (ucp, client) => {
    try {
      await client.connect();
      const res = await client.query(querys.getSessionVigentePorUcp, [ucp]);
      return res.rows.length ? res.rows[0] : null;
    } catch (error) {
      Logger.error("Error getSessionVigentePorUcp", error);
      throw error;
    } finally {
      await client.end();
    }
  };

  marcarSesionVigente = async (codigoSesion, ucp, client) => {
    try {
      await client.connect();
      // 1. Desactivar todas las vigentes del UCP
      await client.query(querys.desactivarVigentesPorUcp, [ucp]);
      // 2. Activar la seleccionada
      const res = await client.query(querys.marcarSesionVigente, [
        codigoSesion,
      ]);
      return res.rows.length ? res.rows[0] : null;
    } catch (error) {
      Logger.error("Error marcarSesionVigente", error);
      throw error;
    } finally {
      await client.end();
    }
  };
}
