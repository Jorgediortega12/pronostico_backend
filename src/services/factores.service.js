import FactoresModel from "../models/factores.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { createConectionPG } from "../helpers/connections.js";
import { findOrCreateFolder } from "../utils/folders.js";
import { insertFileRecord } from "../utils/reportGenerator.js";
import { generateXlsxFactores } from "../utils/generateXlsxFactores.js";

const model = FactoresModel.getInstance();

export default class FactoresService {
  static instance;

  static getInstance() {
    if (!FactoresService.instance) {
      FactoresService.instance = new FactoresService();
    }
    return FactoresService.instance;
  }
  guardarBarra = async (data, session) => {
    try {
      const client = createConectionPG(session);
      const res = await model.guardarBarra(data, client);
      return {
        success: true,
        data: res,
        message: "Barra creada correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        data: null,
        message: "Error al crear la barra",
      };
    }
  };

  consultarBarrasIndex_xMC = async (mc, session) => {
    try {
      const client = createConectionPG(session);
      const res = await model.consultarBarrasIndex_xMC(mc, client);

      if (!res) {
        return {
          success: false,
          data: null,
          message: "Barras no encontradas.",
        };
      }

      return {
        success: true,
        data: res,
        message: "Barras obtenidas correctamente.",
      };
    } catch (err) {
      Logger.error(
        colors.red("Error FactoresService consultarBarrasIndex_xMC"),
        err,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener las barras.",
      };
    }
  };

  actualizarBarra = async (id, data, session) => {
    try {
      const client = createConectionPG(session);
      await model.actualizarBarra(id, data, client);
      return {
        success: true,
        message: "Barra actualizada correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        message: "Error al actualizar la barra",
      };
    }
  };

  guardarAgrupacion = async (data, session) => {
    try {
      const client = createConectionPG(session);
      const res = await model.guardarAgrupacion(data, client);
      return {
        success: true,
        data: res,
        message: "Agrupación creada correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        data: null,
        message: "Error al crear la agrupación",
      };
    }
  };

  consultarAgrupacionesIndex_xBarraId = async (barra_id, session) => {
    try {
      const client = createConectionPG(session);
      const res = await model.consultarAgrupacionesIndex_xBarraId(
        barra_id,
        client,
      );

      if (!res) {
        return {
          success: false,
          data: null,
          message: "Agrupaciones no encontradas.",
        };
      }

      return {
        success: true,
        data: res,
        message: "Agrupaciones obtenidas correctamente.",
      };
    } catch (err) {
      Logger.error(
        colors.red("Error FactoresService consultarAgrupacionesIndex_xBarraId"),
        err,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener las agrupaciones.",
      };
    }
  };

  actualizarAgrupacion = async (id, data, session) => {
    try {
      const client = createConectionPG(session);
      await model.actualizarAgrupacion(id, data, client);
      return {
        success: true,
        message: "Agrupación actualizada correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        message: "Error al actualizar la agrupación",
      };
    }
  };

  eliminarBarraConAgrupaciones = async (id, session) => {
    try {
      const client = createConectionPG(session);
      await model.eliminarBarraConAgrupaciones(id, client);
      return {
        success: true,
        message: "Barra y agrupaciones eliminadas correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        message: "Error al eliminar la barra",
      };
    }
  };

  eliminarAgrupacion = async (id, session) => {
    try {
      const client = createConectionPG(session);
      await model.eliminarAgrupacion(id, client);
      return {
        success: true,
        message: "Agrupación eliminada correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        message: "Error al eliminar la agrupación",
      };
    }
  };

  eliminarRapido = async (data, session) => {
    try {
      const client = createConectionPG(session);
      await model.eliminarMedidasRapido(data, client);
      return { success: true, message: "Medidas eliminadas correctamente" };
    } catch {
      return { success: false, message: "Error al eliminar medidas" };
    }
  };

  actualizarRapido = async (data, session) => {
    try {
      const client = createConectionPG(session);
      await model.actualizarMedidasRapido(data, client);
      return { success: true, message: "Medidas actualizadas correctamente" };
    } catch {
      return { success: false, message: "Error al actualizar medidas" };
    }
  };

  insertarRapido = async (data, session) => {
    try {
      const client = createConectionPG(session);
      await model.insertarMedidasRapido(data, client);
      return { success: true, message: "Medidas insertadas correctamente" };
    } catch {
      return { success: false, message: "Error al insertar medidas" };
    }
  };

  descargarPlantillaMedidas = async () => {
    const filePath = path.join(
      process.cwd(),
      "Plantillas",
      "CargarMedidasPrimeGridt.xlsx",
    );

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        filePath: null,
        message: "La plantilla no existe en el servidor",
      };
    }

    return {
      success: true,
      filePath,
      filename: "CargarMedidasPrimeGridt.xlsx",
      message: "Plantilla obtenida correctamente",
    };
  };

  eliminarFechasIngresadasTodos = async (ucp, session) => {
    try {
      const client = createConectionPG(session);
      await model.eliminarFechasIngresadasTodos(ucp, client);
      return { success: true, message: "Fechas eliminadas correctamente" };
    } catch {
      return { success: false, message: "Error al eliminar fechas" };
    }
  };

  guardarRangoFecha = async (data, session) => {
    try {
      const client = createConectionPG(session);
      await model.guardarRangoFecha(data, client);
      return { success: true, message: "Rango de fecha guardado" };
    } catch {
      return { success: false, message: "Error al guardar rango" };
    }
  };

  reiniciarMedidas = async (session) => {
    try {
      const client = createConectionPG(session);
      await model.reiniciarMedidas(client);
      return { success: true, message: "Medidas reiniciadas" };
    } catch {
      return { success: false, message: "Error al reiniciar medidas" };
    }
  };

  consultarBarraNombre = async (barra, session) => {
    try {
      const client = createConectionPG(session);
      const data = await model.consultarBarraNombre(barra, client);
      return { success: true, data };
    } catch {
      return { success: false, message: "Error al consultar barras" };
    }
  };

  consultarBarraFlujoNombreInicial = async (barra, tipo, session) => {
    try {
      const client = createConectionPG(session);
      const data = await model.consultarBarraFlujoNombreInicial(
        barra,
        tipo,
        client,
      );
      return { success: true, data };
    } catch {
      return { success: false, message: "Error al consultar flujos" };
    }
  };

  consultarBarraFactorNombre = async (barra, tipo, codigosRPM, session) => {
    try {
      const client = createConectionPG(session);
      const data = await model.consultarBarraFactorNombre(
        barra,
        tipo,
        codigosRPM,
        client,
      );

      return {
        success: true,
        data,
        message: "Factores obtenidos correctamente",
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: "Error al consultar factores",
      };
    }
  };

  consultarMedidasCalcularCompleto = async (params, session) => {
    try {
      const client = createConectionPG(session);
      const data = await model.consultarMedidasCalcularCompleto(params, client);

      return {
        success: true,
        data,
        message: "Medidas calculadas correctamente",
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: "Error al calcular medidas",
      };
    }
  };

  async calculosCurvasTipicas(
    inicioIso,
    finIso,
    ucp,
    tipo_dia,
    flujo_tipo,
    n_max,
    barra,
    timeoutMs = 600000,
    session,
  ) {
    // Helper: genera db_url desde session
    const generateDbUrl = (session) => {
      try {
        const { host, usuario, contrasenia, puerto, basededatos } = session;

        if (!host || !usuario || !puerto || !basededatos) {
          throw new Error("Missing required database connection parameters");
        }

        if (contrasenia) {
          return `postgresql://${usuario}:${contrasenia}@${host}:${puerto}/${basededatos}`;
        } else {
          return `postgresql://${usuario}@${host}:${puerto}/${basededatos}`;
        }
      } catch (error) {
        Logger.error("Error generating database URL:", error);
        throw error;
      }
    };

    const database_url = generateDbUrl(session);

    const hostsToTry = ["127.0.0.1", "localhost"];
    //puerto produccion
    // const port = 8003;
    //puerto desarrollo
    const port = 8003;

    for (const host of hostsToTry) {
      let timer;
      try {
        const url = `http://${host}:${port}/factores/calculos/curvas-tipicas`;
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
            fecha_inicial: inicioIso,
            fecha_final: finIso,
            mc: ucp,
            tipo_dia,
            flujo_tipo,
            n_max,
            barra,
            database_url,
          }),
          signal,
        });

        clearTimeout(timer);

        const statusCode = res.status;
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Logger.warn(
            colors.yellow(
              `errorFeedback: HTTP ${statusCode} desde ${host}:${port}`,
            ),
          );
          return { success: false, statusCode, data: json };
        }

        return {
          success: true,
          statusCode,
          data: json,
        };
      } catch (err) {
        clearTimeout(timer);
        if (err?.name === "AbortError") {
          Logger.warn(
            colors.yellow(
              `errorFeedback: timeout (${timeoutMs}ms) hacia ${host}:${port}`,
            ),
          );
        } else {
          Logger.warn(
            colors.yellow(
              `errorFeedback: error conectando a ${host}:${port} — ${
                err?.message || err
              }`,
            ),
          );
        }
      }
    }

    Logger.error(colors.red(`errorFeedback: Falló en todos los hosts`));

    return { success: false, statusCode: 0, data: null };
  }

  async calculoFda(
    inicioIso,
    finIso,
    ucp,
    tipo_dia,
    curvas_tipicas,
    timeoutMs = 600000,
  ) {
    const hostsToTry = ["127.0.0.1", "localhost"];
    //puerto produccion
    // const port = 8003;
    //puerto desarrollo
    const port = 8003;

    for (const host of hostsToTry) {
      let timer;
      try {
        const url = `http://${host}:${port}/factores/calculos/fda`;
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
            fecha_inicial: inicioIso,
            fecha_final: finIso,
            mc: ucp,
            tipo_dia,
            curvas_tipicas,
          }),
          signal,
        });

        clearTimeout(timer);

        const statusCode = res.status;
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Logger.warn(
            colors.yellow(
              `errorFeedback: HTTP ${statusCode} desde ${host}:${port}`,
            ),
          );
          return { success: false, statusCode, data: json };
        }

        return {
          success: true,
          statusCode,
          data: json,
        };
      } catch (err) {
        clearTimeout(timer);
        if (err?.name === "AbortError") {
          Logger.warn(
            colors.yellow(
              `errorFeedback: timeout (${timeoutMs}ms) hacia ${host}:${port}`,
            ),
          );
        } else {
          Logger.warn(
            colors.yellow(
              `errorFeedback: error conectando a ${host}:${port} — ${
                err?.message || err
              }`,
            ),
          );
        }
      }
    }

    Logger.error(colors.red(`errorFeedback: Falló en todos los hosts`));

    return { success: false, statusCode: 0, data: null };
  }

  async calculoFdp(
    inicioIso,
    finIso,
    ucp,
    tipo_dia,
    curvas_tipicas,
    timeoutMs = 600000,
  ) {
    const hostsToTry = ["127.0.0.1", "localhost"];
    //puerto produccion
    // const port = 8003;
    //puerto desarrollo
    const port = 8003;

    for (const host of hostsToTry) {
      let timer;
      try {
        const url = `http://${host}:${port}/factores/calculos/fdp`;
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
            fecha_inicial: inicioIso,
            fecha_final: finIso,
            mc: ucp,
            tipo_dia,
            curvas_tipicas,
          }),
          signal,
        });

        clearTimeout(timer);

        const statusCode = res.status;
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Logger.warn(
            colors.yellow(
              `errorFeedback: HTTP ${statusCode} desde ${host}:${port}`,
            ),
          );
          return { success: false, statusCode, data: json };
        }

        return {
          success: true,
          statusCode,
          data: json,
        };
      } catch (err) {
        clearTimeout(timer);
        if (err?.name === "AbortError") {
          Logger.warn(
            colors.yellow(
              `errorFeedback: timeout (${timeoutMs}ms) hacia ${host}:${port}`,
            ),
          );
        } else {
          Logger.warn(
            colors.yellow(
              `errorFeedback: error conectando a ${host}:${port} — ${
                err?.message || err
              }`,
            ),
          );
        }
      }
    }

    Logger.error(colors.red(`errorFeedback: Falló en todos los hosts`));

    return { success: false, statusCode: 0, data: null };
  }

  async calcularMedidas(inicioIso, finIso, e_ar, ucp, timeoutMs = 600000) {
    const hostsToTry = ["127.0.0.1", "localhost"];
    //puerto produccion
    const port = 8003;
    //puerto desarrollo
    // const port = 8003;

    for (const host of hostsToTry) {
      let timer;

      try {
        const params = new URLSearchParams({
          fecha_inicial: inicioIso,
          fecha_final: finIso,
          e_ar,
          mc: ucp,
        });

        const url = `http://${host}:${port}/factores/medidas/calcular?${params.toString()}`;

        const controller = new AbortController();
        const signal = controller.signal;

        timer = setTimeout(() => {
          controller.abort();
        }, timeoutMs);

        const res = await fetch(url, {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          signal,
        });

        clearTimeout(timer);

        const statusCode = res.status;
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Logger.warn(
            colors.yellow(`calcular: HTTP ${statusCode} desde ${host}:${port}`),
          );
          return { success: false, statusCode, data: json };
        }

        return {
          success: true,
          statusCode,
          data: json,
        };
      } catch (err) {
        clearTimeout(timer);

        if (err?.name === "AbortError") {
          Logger.warn(
            colors.yellow(
              `calcular: timeout (${timeoutMs}ms) hacia ${host}:${port}`,
            ),
          );
        } else {
          Logger.warn(
            colors.yellow(
              `calcular: error conectando a ${host}:${port} — ${
                err?.message || err
              }`,
            ),
          );
        }
      }
    }

    Logger.error(colors.red(`calcular: Falló en todos los hosts`));

    return { success: false, statusCode: 0, data: null };
  }

  buscarUltimaFechaMedida = async (session) => {
    try {
      const client = createConectionPG(session);
      const row = await model.buscarUltimaFechaMedida(client);
      return { success: true, data: row, message: "Búsqueda completada." };
    } catch (error) {
      Logger.error(
        colors.red("Error FactoresService buscarUltimaFechaMedida"),
        error,
      );
      return {
        success: false,
        data: null,
        message: `Error al buscar la ultima fecha medidas.`,
      };
    }
  };

  obtenerDatosCompletoBarra = async (params, session) => {
    const {
      barras, // array de strings con nombres de barras
      fecha_inicial,
      fecha_final,
      mc,
      tipo_dia,
      flujo_tipo,
      n_max,
    } = params;

    try {
      const client = createConectionPG(session);

      // ── 1. Todos los datos estáticos de todas las barras en paralelo ──
      const infoBarras = await Promise.all(
        barras.map(async (barra) => {
          const [codigosRpmRows, flujosRows] = await Promise.all([
            model.consultarBarraNombre(barra, client),
            model.consultarBarraFlujoNombreInicial(barra, flujo_tipo, client),
          ]);

          const codigosRpm = codigosRpmRows?.map((r) => r.codigo_rpm) ?? [];
          const flujos = flujosRows?.map((r) => r.flujo) ?? [];

          const factoresRows =
            codigosRpm.length > 0
              ? await model.consultarBarraFactorNombre(
                  barra,
                  flujo_tipo,
                  codigosRpm, // <-- directo, sin envolver en objeto
                  client,
                )
              : [];

          return { barra, codigosRpm, flujos, factoresRows };
        }),
      );

      // ── Helper: ejecutar en lotes para no agotar el pool de conexiones ──
      const procesarEnLotes = async (items, tamanoLote, fn) => {
        const resultados = [];
        for (let i = 0; i < items.length; i += tamanoLote) {
          const lote = items.slice(i, i + tamanoLote);
          const resultadosLote = await Promise.all(lote.map(fn));
          resultados.push(...resultadosLote);
        }
        return resultados;
      };

      const medidasPorBarra = await procesarEnLotes(
        infoBarras,
        3,
        async ({ barra, codigosRpm, flujos }) => {
          if (!codigosRpm.length || !flujos.length) return null;

          // ⚠️ Crear client NUEVO por cada llamada porque el model hace connect/end
          const clientMedida = createConectionPG(session);
          try {
            const rows = await model.consultarMedidasCalcularCompleto(
              {
                fecha_inicial,
                fecha_final,
                mc,
                flujo: flujos,
                tipo_dia,
                codigo_rpm: codigosRpm,
                barra,
              },
              clientMedida,
            );
            // El model devuelve rows directamente (no { data: rows })
            return { data: rows ?? [] };
          } catch (err) {
            Logger.error(`Error medidas barra ${barra}:`, err);
            return { data: [] };
          }
        },
      );

      // ── 3. Curvas en lotes de 3 ──
      const curvasPorBarra = await procesarEnLotes(barras, 3, async (barra) => {
        const res = await this.calculosCurvasTipicas(
          fecha_inicial,
          fecha_final,
          mc,
          tipo_dia,
          flujo_tipo,
          n_max,
          barra,
          600000,
          session,
        );
        return res;
      });

      // ── 3. Armar respuesta ──
      const resultado = infoBarras.map((info, idx) => ({
        barra: info.barra,
        factoresRows: info.factoresRows ?? [],
        medidas: medidasPorBarra[idx]?.data ?? [],
        curvas: curvasPorBarra[idx]?.data?.data ?? [], // ← era .data.data.data, es .data.data
      }));

      return {
        success: true,
        data: resultado,
        message: "Datos completos obtenidos correctamente",
      };
    } catch (err) {
      Logger.error(colors.red("Error obtenerDatosCompletoBarra"), err);
      return {
        success: false,
        data: null,
        message: "Error al obtener datos completos",
      };
    }
  };
  guardarSesionReporteFactores = async (params, session) => {
    const {
      ucp,
      fecha_inicio,
      fecha_fin,
      usuario,
      resultadosFdaFdp,
      sumasRef, // ← reemplaza comboDataMap
      observacion,
    } = params;

    try {
      // ── 1. Nombre y versión ── (igual)
      const hoy = new Date().toISOString().split("T")[0];
      const nombre = `${ucp}_FACTORES_${fecha_inicio}_${fecha_fin}`;
      const clientV = createConectionPG(session);
      const versionRows = await model.buscarVersionSesionFactores(
        nombre,
        clientV,
      );
      const ultimaVersion = versionRows?.[0]?.version ?? 0;
      const version = Number(ultimaVersion) + 1;
      const nombrearchivo = `ReporteFactores_${ucp}_${hoy}_v${version}.xlsx`;

      // ── 2. Crear sesión ── (igual)
      const clientS = createConectionPG(session);
      const sesion = await model.agregarSesionFactores(
        {
          fecha: new Date().toISOString(),
          ucp,
          fecha_inicio,
          fecha_fin,
          usuario,
          nombre,
          version,
          nombrearchivo,
          observacion: observacion ?? "",
        },
        clientS,
      );
      if (!sesion?.codigo)
        throw new Error("No se pudo crear la sesión de factores");
      const codsesion = sesion.codigo;

      // ── 3. Guardar MW Ref y MVAR — directo desde sumasRef ──
      for (const ref of sumasRef) {
        const clientR = createConectionPG(session);
        await model.agregarRefFactores(
          {
            codsesion,
            tipo_dia: ref.tipo_dia,
            tipo_energia: ref.tipo_energia,
            ...ref.periodos,
          },
          clientR,
        );
      }

      // ── 4. Guardar FDA y FDP por barra ──
      for (const fila of resultadosFdaFdp) {
        const clientF = createConectionPG(session);
        await model.agregarFactorSesion(
          {
            codsesion,
            tipo_dia: fila.tipoDia,
            tipo_factor: fila.tipo, // "FDA" | "FDP"
            barra: fila.barra,
            ...fila.periodos,
          },
          clientF,
        );
      }

      // ── 5. Guardar archivo en carpetas + archivos ──
      const reportDirPhysicalRoot =
        process.env.REPORT_DIR || path.join(process.cwd(), "reportes");
      const hoyDate = new Date();
      const yyyy = String(hoyDate.getFullYear());
      const mm = String(hoyDate.getMonth() + 1).padStart(2, "0");
      const monthNames = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ];
      const monthName = monthNames[hoyDate.getMonth()];

      const clientCarpeta = createConectionPG(session);
      await clientCarpeta.connect();

      let codcarpeta, folderPathPhysical, folderPathLogical;
      try {
        const root = await findOrCreateFolder(clientCarpeta, "reportes", 0, 1);
        const factores = await findOrCreateFolder(
          clientCarpeta,
          "Factores",
          root.codigo,
          2,
        );
        const ucpF = await findOrCreateFolder(
          clientCarpeta,
          ucp,
          factores.codigo,
          3,
        );
        const yearF = await findOrCreateFolder(
          clientCarpeta,
          yyyy,
          ucpF.codigo,
          4,
        );
        const monthF = await findOrCreateFolder(
          clientCarpeta,
          monthName,
          yearF.codigo,
          5,
        );

        codcarpeta = monthF.codigo;
        folderPathLogical = `~/reportes/factores/${ucp}/${yyyy}/${monthName}`;
        folderPathPhysical = path.join(
          reportDirPhysicalRoot,
          "factores",
          ucp,
          yyyy,
          monthName,
        );

        if (!fs.existsSync(folderPathPhysical)) {
          fs.mkdirSync(folderPathPhysical, { recursive: true });
        }
      } finally {
        await clientCarpeta.end();
      }

      // ── Generar excel físico ──
      await generateXlsxFactores({
        sumasRef,
        resultadosFdaFdp,
        folderPhysical: folderPathPhysical,
        nombrearchivo,
        selectedSource: ucp,
        fechaInicio: fecha_inicio,
        fechaFin: fecha_fin,
      });

      const rutaBD = `${folderPathLogical}/${nombrearchivo}`;

      const clientArch = createConectionPG(session);
      await clientArch.connect();
      let codarchivo = null;
      try {
        await clientArch.query("BEGIN");
        const resArch = await insertFileRecord(clientArch, {
          nombreArchivo: nombrearchivo,
          rutaArchivo: rutaBD,
          codcarpeta,
          contentType: null,
        });
        codarchivo = resArch?.codigo ?? null;
        await clientArch.query("COMMIT");
      } catch (err) {
        await clientArch.query("ROLLBACK");
        Logger.error(colors.red("Error insertando archivo factores:"), err);
      } finally {
        await clientArch.end();
      }

      if (codarchivo) {
        const clientLink = createConectionPG(session);
        await model.agregarArchivoSesionFactores(
          { codsesion, codarchivo, tipo: "xlsx" },
          clientLink,
        );
      }

      return {
        success: true,
        codsesion,
        nombre,
        version,
        nombrearchivo,
        folderPathPhysical,
        message: `Sesión de factores guardada correctamente (v${version})`,
      };
    } catch (err) {
      Logger.error(colors.red("Error guardarSesionReporteFactores"), err);
      return {
        success: false,
        message: err.message || "Error al guardar sesión de factores",
      };
    }
  };

  cargarSesionFactoresPorCodigo = async (codArchivo, session) => {
    try {
      const client1 = createConectionPG(session);
      // 1. Obtener la sesión a través del archivo
      const sesionRows = await model.buscarSesionPorArchivo(
        codArchivo,
        client1,
      );
      if (!sesionRows?.length)
        return { success: false, message: "Sesión no encontrada" };
      const sesion = sesionRows[0];

      // 2. Obtener sumasRef
      const client2 = createConectionPG(session);
      const refRows = await model.buscarRefPorSesion(sesion.codigo, client2);

      // 3. Obtener FDA/FDP
      const client3 = createConectionPG(session);
      const factorRows = await model.buscarFactoresPorSesion(
        sesion.codigo,
        client3,
      );

      // 4. Armar sumasRef
      const PERIODOS = Array.from({ length: 24 }, (_, i) => `p${i + 1}`);
      const sumasRef = refRows.map((r) => ({
        tipo_dia: r.tipo_dia,
        tipo_energia: r.tipo_energia,
        periodos: Object.fromEntries(
          PERIODOS.map((p) => [p, Number(r[p]) || 0]),
        ),
      }));

      // 5. Armar resultadosFdaFdp
      const resultadosFdaFdp = factorRows.map((f) => ({
        tipoDia: f.tipo_dia,
        tipo: f.tipo_factor, // "FDA" | "FDP"
        barra: f.barra,
        periodos: Object.fromEntries(
          PERIODOS.map((p) => [p, Number(f[p]) || 0]),
        ),
      }));

      return {
        success: true,
        data: {
          codsesion: sesion.codigo,
          ucp: sesion.ucp,
          fecha_inicio: sesion.fecha_inicio,
          fecha_fin: sesion.fecha_fin,
          usuario: sesion.usuario,
          nombre: sesion.nombre,
          version: sesion.version,
          nombrearchivo: sesion.nombrearchivo,
          observacion: sesion.observacion ?? "",
          sumasRef,
          resultadosFdaFdp,
        },
      };
    } catch (err) {
      Logger.error("Error cargarSesionFactoresPorCodigo service", err);
      return { success: false, message: err.message };
    }
  };
  cargarArchivoVrSesionesFactores = async (codcarpeta, session) => {
    try {
      const client = createConectionPG(session);
      const rows = await model.cargarArchivoVrSesionesFactores(
        codcarpeta,
        client,
      );

      if (!rows) {
        return {
          success: false,
          data: null,
          message: "No se encontraron versiones de sesiones de factores",
        };
      }

      return {
        success: true,
        data: rows,
        message: "Versiones de sesiones de factores cargadas exitosamente",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error FactoresService cargarArchivoVrSesionesFactores"),
      );
      return {
        success: false,
        data: null,
        message: "Error al cargar versiones de sesiones de factores",
      };
    }
  };

  getUltimaSesionFactores = async (ucp, session) => {
    try {
      const client = createConectionPG(session);
      const data = await model.getUltimaSesionFactoresPorUcp(ucp, client);

      if (!data) {
        return {
          success: false,
          message: "Sin sesiones guardadas para este UCP",
        };
      }

      const { sesion, factores } = data;

      // Construir resultadosFdaFdp en el mismo formato que usa el frontend
      // { tipoDia, tipo, barra, periodos: { p1..p24 } }
      const resultadosFdaFdp = factores.map((f) => ({
        tipoDia: f.tipo_dia,
        tipo: f.tipo, // "FDA" o "FDP"
        barra: f.barra,
        periodos: {
          p1: Number(f.p1) || 0,
          p2: Number(f.p2) || 0,
          p3: Number(f.p3) || 0,
          p4: Number(f.p4) || 0,
          p5: Number(f.p5) || 0,
          p6: Number(f.p6) || 0,
          p7: Number(f.p7) || 0,
          p8: Number(f.p8) || 0,
          p9: Number(f.p9) || 0,
          p10: Number(f.p10) || 0,
          p11: Number(f.p11) || 0,
          p12: Number(f.p12) || 0,
          p13: Number(f.p13) || 0,
          p14: Number(f.p14) || 0,
          p15: Number(f.p15) || 0,
          p16: Number(f.p16) || 0,
          p17: Number(f.p17) || 0,
          p18: Number(f.p18) || 0,
          p19: Number(f.p19) || 0,
          p20: Number(f.p20) || 0,
          p21: Number(f.p21) || 0,
          p22: Number(f.p22) || 0,
          p23: Number(f.p23) || 0,
          p24: Number(f.p24) || 0,
        },
      }));

      return {
        success: true,
        data: {
          id: sesion.codigo,
          nombre: sesion.nombre,
          version: sesion.version,
          ucp: sesion.ucp,
          fecha_inicio: sesion.fecha_inicio,
          fecha_fin: sesion.fecha_fin,
          observacion: sesion.observacion,
          created_at: sesion.fecha,
          resultadosFdaFdp,
        },
      };
    } catch {
      return {
        success: false,
        message: "Error al obtener la sesión de factores",
      };
    }
  };

  getSessionVigente = async (ucp, session) => {
    try {
      const client = createConectionPG(session);
      const data = await model.getSessionVigentePorUcp(ucp, client);
      if (!data) {
        return { success: false, message: "Sin sesión vigente para este UCP" };
      }
      return {
        success: true,
        data: {
          id: data.codigo,
          nombre: data.nombre,
          version: data.version,
          ucp: data.ucp,
          fecha_inicio: data.fecha_inicio,
          fecha_fin: data.fecha_fin,
          observacion: data.observacion,
          created_at: data.fecha,
          vigente: data.vigente,
        },
      };
    } catch {
      return { success: false, message: "Error al obtener sesión vigente" };
    }
  };

  marcarSesionVigente = async (codigoSesion, ucp, session) => {
    try {
      const client = createConectionPG(session);
      const data = await model.marcarSesionVigente(codigoSesion, ucp, client);
      if (!data) {
        return { success: false, message: "No se pudo marcar como vigente" };
      }
      return { success: true, data, message: "Sesión marcada como vigente" };
    } catch {
      return { success: false, message: "Error al marcar sesión vigente" };
    }
  };

  async calculosCurvasTipicasCircuitos(medidas, n_max, timeoutMs = 600000) {
    const hostsToTry = ["127.0.0.1", "localhost"];
    const port = 8003;

    for (const host of hostsToTry) {
      let timer;
      try {
        const url = `http://${host}:${port}/factores/calculos/curvas-tipicas-circuitos`;
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ medidas, n_max }),
          signal: controller.signal,
        });

        clearTimeout(timer);
        const statusCode = res.status;
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Logger.warn(
            colors.yellow(
              `errorFeedback: HTTP ${statusCode} desde ${host}:${port} [curvas-tipicas-circuitos]`,
            ),
          );
          return { success: false, statusCode, data: json };
        }

        return { success: true, statusCode, data: json };
      } catch (err) {
        clearTimeout(timer);
        const msg =
          err?.name === "AbortError"
            ? `timeout (${timeoutMs}ms)`
            : err?.message || err;
        Logger.warn(
          colors.yellow(
            `errorFeedback: error conectando a ${host}:${port} — ${msg} [curvas-tipicas-circuitos]`,
          ),
        );
      }
    }

    Logger.error(
      colors.red(
        "errorFeedback: Falló en todos los hosts [curvas-tipicas-circuitos]",
      ),
    );
    return { success: false, statusCode: 0, data: null };
  }

  async guardarReporteDNA({ ucp, fecha_inicio, fecha_fin, filas, dna_total }) {
    // ── 1. Construir ruta igual que el .NET: Reportes/DNA/<UCP>/<año>/<mes>/
    const fechaFin = new Date(fecha_fin);
    const anio = fechaFin.getFullYear().toString();
    const mes = String(fechaFin.getMonth() + 1).padStart(2, "0");
    const ucpCap = ucp.charAt(0).toUpperCase() + ucp.slice(1).toLowerCase();
    const codAbrev = `U${ucpCap}`;
    const dd = String(fechaFin.getDate()).padStart(2, "0");
    const mm = mes;
    const nombreBase = `${codAbrev}dnapt${dd}${mm}`;

    const carpeta = path.join(
      process.cwd(),
      "Reportes",
      "DNA",
      ucpCap,
      anio,
      mes,
    );
    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });

    const rutaXlsx = path.join(carpeta, `${nombreBase}.xlsx`);

    // ── 2. Generar Excel con exceljs (mismo formato que SLDocument del .NET)
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("VECTORIAL");

    // Cabecera
    ws.columns = [
      { header: "PERIODOS", key: "periodo", width: 12 },
      { header: "PRO", key: "pro", width: 14 },
      { header: "DA", key: "da", width: 14 },
      { header: "DNA", key: "dna", width: 14 },
      { header: "DR", key: "dr", width: 14 },
    ];

    // Estilo cabecera (gris igual que .NET)
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF7A7A7A" },
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center" };
    });

    // Filas de datos (P1..P24)
    filas.forEach((f) => ws.addRow(f));

    // Fila total
    const totalRow = ws.addRow({
      periodo: "TOTAL",
      pro: filas.reduce((s, f) => s + f.pro, 0),
      da: filas.reduce((s, f) => s + f.da, 0),
      dna: dna_total,
      dr: filas.reduce((s, f) => s + f.dr, 0),
    });
    totalRow.font = { bold: true };
    totalRow.getCell("dna").font = { bold: true, color: { argb: "FF009653" } };

    // Congelar primera fila
    ws.views = [{ state: "frozen", ySplit: 1 }];

    // Formato numérico 6 decimales para columnas de valor
    ["pro", "da", "dna", "dr"].forEach((key) => {
      ws.getColumn(key).numFmt = "#,##0.000000";
    });

    // Metadatos del libro
    ws.getCell("G1").value = ucp.toUpperCase();
    ws.getCell("G2").value = fecha_fin;

    await wb.xlsx.writeFile(rutaXlsx);

    // ── 3. Guardar referencia en DB
    //    Adaptar a tu ORM/query builder. Ejemplo con tu patrón de configuracion:
    //    c.insertArchivoCarpeta(codigoMes, nombreBase + ".xlsx", rutaRelativa)
    //    Aquí retornamos la info para que el controller la guarde:
    return {
      ruta: rutaXlsx,
      nombre: `${nombreBase}.xlsx`,
      ucp,
      fecha_inicio,
      fecha_fin,
      dna_total,
    };
  }
}
