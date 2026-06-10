import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import CubrimientoModel from "../models/cubrimiento.model.js";
import DemandaService from "./demanda.service.js";
import Logger from "../helpers/logger.js";

// Error de negocio con código HTTP asociado (replica las HTTPException del origen).
class ServiceError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

const TIPOS_DIA = ["H", "S", "F"];
const NOMBRE_TIPO_DIA = { H: "Hábil", S: "Sábado", F: "Festivo" };
const COLUMNAS_DETALLE = [
  "AÑO", "MES", "DÍAS",
  ...Array.from({ length: 24 }, (_, i) => `H${i + 1}`),
];

export default class CubrimientoService {
  static instance;
  static getInstance() {
    if (!CubrimientoService.instance) {
      CubrimientoService.instance = new CubrimientoService();
    }
    return CubrimientoService.instance;
  }

  #model = CubrimientoModel.getInstance();
  #demanda = DemandaService.getInstance();

  // ─── Helpers de Excel ──────────────────────────────────────────────────────

  #leerExcel = (rutaArchivo) => {
    const wb = XLSX.readFile(rutaArchivo);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: null });
  };

  #parseDatos = (datos) => {
    if (!datos) return {};
    return typeof datos === "string" ? JSON.parse(datos) : datos;
  };

  // ─── Perfil (modelo guardado) → {fechas, demandas} ──────────────────────────

  #obtenerDatosPerfil = async (perfilId) => {
    const modelo = await this.#demanda.retrieveModelValues(perfilId);
    if (!modelo || !modelo.dates || !modelo.values || !modelo.dates.length) {
      throw new ServiceError(`Modelo con ID ${perfilId} no encontrado o inválido`, 404);
    }
    const demandas = {};
    for (let i = 0; i < modelo.dates.length; i++) {
      const clave = modelo.dates[i].split("-").slice(0, 2).join("-"); // YYYY-MM
      demandas[clave] = modelo.values[i];
    }
    return { fechas: Object.keys(demandas), demandas };
  };

  // ─── Cálculos base ──────────────────────────────────────────────────────────

  #calcularEnergiaContratada = (datosContrato, anio, mesInicial, mesFinal, codigoSic) => {
    const datosJson = this.#parseDatos(datosContrato);
    const rutaArchivo = datosJson.ruta_archivo;
    const df = this.#leerExcel(rutaArchivo);

    const sic = parseInt(codigoSic, 10);
    const dfSic = df.filter((r) => parseInt(r.SIC, 10) === sic);

    const numMeses = mesFinal - mesInicial + 1;
    const energiaMensual = new Array(numMeses).fill(0);

    if (dfSic.length === 0) {
      Logger.warn(`No se encontraron datos para el SIC ${sic}`);
      return energiaMensual;
    }

    for (let i = 0; i < numMeses; i++) {
      const mes = mesInicial + i;
      const anoMes = parseInt(`${anio}${String(mes).padStart(2, "0")}`, 10);
      const dfMes = dfSic.filter((r) => parseInt(r.ANO_MES, 10) === anoMes);

      let energiaTotal = 0;
      for (const tipoDia of TIPOS_DIA) {
        const dfTipo = dfMes.filter((r) => r.TIPO_DIA === tipoDia);
        if (dfTipo.length > 0) {
          const fila = dfTipo[0];
          const numDias = fila.DIAS != null ? Number(fila.DIAS) : 1;
          for (let h = 1; h <= 24; h++) {
            const valor = fila[`EH${h}`];
            if (valor != null) energiaTotal += Number(valor) * numDias;
          }
        }
      }
      energiaMensual[i] = energiaTotal;
    }

    return energiaMensual.map((v) => v * 1000);
  };

  #calcularEnergiaEstimada = (datosPerfil, anio, mesInicial, mesFinal) => {
    const numMeses = mesFinal - mesInicial + 1;
    const energiaMensual = new Array(numMeses).fill(0);
    const demandas = datosPerfil.demandas || {};

    for (let i = 0; i < numMeses; i++) {
      const mes = mesInicial + i;
      const claveMes = `${anio}-${String(mes).padStart(2, "0")}`;
      if (demandas[claveMes] != null) {
        energiaMensual[i] = Number(demandas[claveMes]);
      } else {
        Logger.warn(`No se encontraron datos para el mes ${claveMes}`);
      }
    }
    return energiaMensual;
  };

  #calcularDesviacion = (energiaPrevista, energiaContratada) =>
    energiaPrevista.map((v, i) => v - energiaContratada[i]);

  #calcularCubrimiento = (tipoCalculo, desviacion) => {
    switch (tipoCalculo) {
      case "bolsa_neta":
        return desviacion.slice();
      case "venta_bolsa":
        return desviacion.map((d) => (d < 0 ? -d : 0));
      case "compra_bolsa":
        return desviacion.map((d) => (d > 0 ? d : 0));
      default:
        throw new ServiceError(`Tipo de cálculo no válido: ${tipoCalculo}`, 400);
    }
  };

  #obtenerPorcentajesSeleccionados = async (params, anio, mesInicial, mesFinal) => {
    let porcentajes = params?.porcentajes_cubrimiento?.[String(anio)] || null;
    if (!porcentajes) {
      const rows = await this.#model.getPorcentajeByAnio(anio);
      porcentajes = rows.length ? rows.map((p) => p.valor) : new Array(12).fill(90);
    }
    return porcentajes.slice(mesInicial - 1, mesFinal);
  };

  #prepararDatosGrafica = (tipoDato, tipoGrafica, energiaEstimada, energiaContratada, energiaPrevista, anio, mesInicial, mesFinal) => {
    if (tipoDato === "mensual") {
      const datosX = [];
      for (let m = mesInicial; m <= mesFinal; m++) datosX.push(`${anio}-${String(m).padStart(2, "0")}`);

      if (tipoGrafica === "area") {
        return {
          tipo: "area",
          datos_x: datosX,
          series: [
            { nombre: "Energía Pronosticada", datos: energiaEstimada },
            { nombre: "Energía Prevista a Contratar", datos: energiaPrevista },
            { nombre: "Energía Contratada", datos: energiaContratada },
          ],
        };
      }
      return {
        tipo: "barras",
        datos_x: datosX,
        series: [
          { nombre: "Energía Contratada", datos: energiaContratada },
          { nombre: "Energía Prevista a Contratar", datos: energiaPrevista.map((v, i) => v - energiaContratada[i]) },
          { nombre: "Energía Pronosticada", datos: energiaEstimada.map((v, i) => v - energiaPrevista[i]) },
        ],
      };
    }

    // anual
    const contratadaAnual = energiaContratada.reduce((a, b) => a + b, 0);
    const estimadaAnual = energiaEstimada.reduce((a, b) => a + b, 0);
    const datosX = [String(anio)];
    if (tipoGrafica === "area") {
      return {
        tipo: "area",
        datos_x: datosX,
        series: [
          { nombre: "Energía Contratada", datos: [contratadaAnual] },
          { nombre: "Energía Pronosticada", datos: [estimadaAnual] },
        ],
      };
    }
    return {
      tipo: "barras",
      datos_x: datosX,
      series: [
        { nombre: "Energía Contratada", datos: [contratadaAnual] },
        { nombre: "Desviación", datos: [estimadaAnual - contratadaAnual] },
      ],
    };
  };

  #prepararResultadosTabulares = (energiaEstimada, energiaContratada, energiaPrevista, desviacion, resultadosCubrimiento, anio, mesInicial, mesFinal) => {
    const columnas = [];
    for (let m = mesInicial; m <= mesFinal; m++) columnas.push(`${anio}-${String(m).padStart(2, "0")}`);
    columnas.push("Total");

    const total = (arr) => arr.reduce((a, b) => a + b, 0);
    const fila = (nombre, arr) => ({ nombre, valores: [...arr, total(arr)] });

    return {
      columnas,
      filas: [
        fila("Demanda", energiaEstimada),
        fila("Contrato", energiaContratada),
        fila("D.P.C.", energiaPrevista),
        fila("Bolsa", desviacion),
        fila("Resultados", resultadosCubrimiento),
      ],
    };
  };

  #construirResultado = (energiaContratada, energiaEstimada, energiaPrevista, desviacion, resultadosCubrimiento, datosGrafica, tabla) => ({
    energia_contratada: energiaContratada,
    energia_estimada: energiaEstimada,
    desviacion,
    resultados_cubrimiento: resultadosCubrimiento,
    energia_prevista: energiaPrevista,
    grafica: datosGrafica,
    tabla,
  });

  // ─── Procesar cubrimiento (un contrato) ──────────────────────────────────────

  procesarCubrimiento = async (contratoId, perfilId, params) => {
    const contrato = await this.#model.getContratoById(contratoId);
    if (!contrato) {
      throw new ServiceError(`Contrato con ID ${contratoId} no encontrado`, 404);
    }

    const datosPerfil = await this.#obtenerDatosPerfil(perfilId);
    const { tipo_calculo, tipo_dato, tipo_grafica, mes_inicial, mes_final, anio } = params;

    const energiaContratada = this.#calcularEnergiaContratada(
      contrato.datos, anio, mes_inicial, mes_final, contrato.codigo_sic
    );
    const energiaEstimada = this.#calcularEnergiaEstimada(datosPerfil, anio, mes_inicial, mes_final);

    const porcentajes = await this.#obtenerPorcentajesSeleccionados(params, anio, mes_inicial, mes_final);
    const energiaPrevista = energiaEstimada.map((v, i) => (v * porcentajes[i]) / 100);
    const desviacion = this.#calcularDesviacion(energiaPrevista, energiaContratada);
    const resultadosCubrimiento = this.#calcularCubrimiento(tipo_calculo, desviacion);

    const datosGrafica = this.#prepararDatosGrafica(
      tipo_dato, tipo_grafica, energiaEstimada, energiaContratada, energiaPrevista, anio, mes_inicial, mes_final
    );
    const tabla = this.#prepararResultadosTabulares(
      energiaEstimada, energiaContratada, energiaPrevista, desviacion, resultadosCubrimiento, anio, mes_inicial, mes_final
    );

    return this.#construirResultado(
      energiaContratada, energiaEstimada, energiaPrevista, desviacion, resultadosCubrimiento, datosGrafica, tabla
    );
  };

  // ─── Procesar cubrimiento (todos los contratos del año) ──────────────────────

  procesarCubrimientoTodos = async (anio, perfilId, params) => {
    const contratos = await this.#model.getContratosByAnio(anio);
    if (!contratos.length) {
      throw new ServiceError(`No se encontraron contratos para el año ${anio}`, 404);
    }

    const datosPerfil = await this.#obtenerDatosPerfil(perfilId);
    const { tipo_calculo, tipo_dato, tipo_grafica, mes_inicial, mes_final } = params;

    const numMeses = mes_final - mes_inicial + 1;
    const energiaContratadaTotal = new Array(numMeses).fill(0);
    let procesados = 0;

    for (const contrato of contratos) {
      try {
        const energia = this.#calcularEnergiaContratada(
          contrato.datos, anio, mes_inicial, mes_final, contrato.codigo_sic
        );
        for (let i = 0; i < numMeses; i++) energiaContratadaTotal[i] += energia[i];
        procesados++;
      } catch (err) {
        Logger.error(`Error procesando contrato SIC ${contrato.codigo_sic}: ${err.message}`);
      }
    }

    if (procesados === 0) {
      throw new ServiceError("No se pudo procesar ningún contrato para este año", 500);
    }

    const energiaEstimada = this.#calcularEnergiaEstimada(datosPerfil, anio, mes_inicial, mes_final);
    const porcentajes = await this.#obtenerPorcentajesSeleccionados(params, anio, mes_inicial, mes_final);
    const energiaPrevista = energiaEstimada.map((v, i) => (v * porcentajes[i]) / 100);
    const desviacion = this.#calcularDesviacion(energiaPrevista, energiaContratadaTotal);
    const resultadosCubrimiento = this.#calcularCubrimiento(tipo_calculo, desviacion);

    const datosGrafica = this.#prepararDatosGrafica(
      tipo_dato, tipo_grafica, energiaEstimada, energiaContratadaTotal, energiaPrevista, anio, mes_inicial, mes_final
    );
    const tabla = this.#prepararResultadosTabulares(
      energiaEstimada, energiaContratadaTotal, energiaPrevista, desviacion, resultadosCubrimiento, anio, mes_inicial, mes_final
    );

    return this.#construirResultado(
      energiaContratadaTotal, energiaEstimada, energiaPrevista, desviacion, resultadosCubrimiento, datosGrafica, tabla
    );
  };

  // ─── Años disponibles ────────────────────────────────────────────────────────

  obtenerAniosDisponibles = async () => {
    return this.#model.getAniosContratos();
  };

  // ─── Carga de archivo de contratos ───────────────────────────────────────────

  procesarArchivoContrato = async (archivo) => {
    if (!archivo) throw new ServiceError("No se proporcionó ningún archivo", 422);

    const rutaArchivo = archivo.path;
    const nombreOriginal = archivo.originalname;

    try {
      const contratosEncontrados = this.#extraerContratosExcel(rutaArchivo);
      Logger.info(`Total contratos encontrados: ${contratosEncontrados.length}`);

      const exitosos = [];
      for (const contrato of contratosEncontrados) {
        const codigoSic = String(parseInt(contrato.codigo_sic, 10));
        const anio = parseInt(contrato.anio, 10);

        const existe = await this.#model.getContratoBySicAnio(codigoSic, anio);
        const datosJson = JSON.stringify({ ruta_archivo: rutaArchivo });

        if (!existe) {
          await this.#model.insertContrato(nombreOriginal, datosJson, codigoSic, anio);
          exitosos.push({ ...contrato, accion: "creado" });
        } else {
          // Borrar archivo viejo antes de actualizar
          try {
            const datosViejos = this.#parseDatos(existe.datos);
            const rutaVieja = datosViejos.ruta_archivo;
            if (rutaVieja && rutaVieja !== rutaArchivo && fs.existsSync(rutaVieja)) {
              fs.unlinkSync(rutaVieja);
            }
          } catch (err) {
            Logger.warn(`No se pudo eliminar archivo viejo: ${err.message}`);
          }
          await this.#model.updateContrato(existe.id, nombreOriginal, datosJson);
          exitosos.push({ ...contrato, accion: "actualizado" });
        }
      }

      Logger.info(`Contratos procesados con éxito: ${exitosos.length}`);
      return exitosos;
    } catch (err) {
      // Borrar el archivo subido si hubo un error general
      if (rutaArchivo && fs.existsSync(rutaArchivo)) {
        try { fs.unlinkSync(rutaArchivo); } catch { /* ignore */ }
      }
      if (err instanceof ServiceError) throw err;
      Logger.error(err);
      throw new ServiceError(`Error al procesar archivo: ${err.message}`, 422);
    }
  };

  #extraerContratosExcel = (rutaArchivo) => {
    const df = this.#leerExcel(rutaArchivo);

    const requeridas = ["SIC", "ANO_MES", "TIPO_DIA"];
    const columnas = df.length ? Object.keys(df[0]) : [];
    for (const col of requeridas) {
      if (!columnas.includes(col)) {
        throw new ServiceError(`Falta la columna requerida: ${col}`, 422);
      }
    }

    const contratos = [];
    const sicUnicos = [...new Set(df.map((r) => r.SIC))];
    for (const sic of sicUnicos) {
      const dfSic = df.filter((r) => r.SIC === sic);
      const anios = [...new Set(dfSic.map((r) => parseInt(String(r.ANO_MES).slice(0, 4), 10)))];
      for (const anio of anios) {
        contratos.push({
          codigo_sic: sic,
          anio,
          nombre_archivo: path.basename(rutaArchivo),
        });
      }
    }
    return contratos;
  };

  // ─── Listado de contratos por año ────────────────────────────────────────────

  obtenerContratosPorAnio = async (anio) => {
    const contratos = await this.#model.getContratosByAnio(anio);
    return contratos.map((contrato) => {
      const datos = this.#parseDatos(contrato.datos);
      const rutaArchivo = datos.ruta_archivo || "";
      return {
        id: contrato.id,
        codigo_sic: contrato.codigo_sic,
        nombre_archivo: rutaArchivo ? path.basename(rutaArchivo) : contrato.nombre,
        fecha_creacion: contrato.fecha_creacion,
      };
    });
  };

  // ─── Detalle de un contrato (datos horarios) ─────────────────────────────────

  obtenerDetalleContrato = async (sic, anio, mesInicial, mesFinal) => {
    const contrato = await this.#model.getContratoBySicAnio(String(sic), anio);
    if (!contrato) {
      throw new ServiceError(`No se encontró contrato con SIC ${sic} para el año ${anio}`, 404);
    }

    const rutaArchivo = this.#parseDatos(contrato.datos).ruta_archivo;
    const df = this.#leerExcel(rutaArchivo);
    const sicNumerico = parseInt(sic, 10);
    const dfSic = df.filter((r) => parseInt(r.SIC, 10) === sicNumerico);

    const filas = [];
    for (let mes = mesInicial; mes <= mesFinal; mes++) {
      const anoMes = parseInt(`${anio}${String(mes).padStart(2, "0")}`, 10);
      const dfMes = dfSic.filter((r) => parseInt(r.ANO_MES, 10) === anoMes);

      for (const tipoCodigo of TIPOS_DIA) {
        const dfTipo = dfMes.filter((r) => r.TIPO_DIA === tipoCodigo);
        if (dfTipo.length > 0) {
          const origen = dfTipo[0];
          const fila = { AÑO: anio, MES: mes, DÍAS: NOMBRE_TIPO_DIA[tipoCodigo] };
          for (let h = 1; h <= 24; h++) {
            const valor = origen[`EH${h}`];
            fila[`H${h}`] = valor != null ? Number(valor) : 0;
          }
          filas.push(fila);
        }
      }
    }

    return { columnas: COLUMNAS_DETALLE, filas };
  };

  obtenerDetalleContratoTodos = async (anio, mesInicial, mesFinal) => {
    const contratos = await this.#model.getContratosByAnio(anio);
    if (!contratos.length) {
      throw new ServiceError(`No se encontraron contratos para el año ${anio}`, 404);
    }

    // Acumular por (mes, tipoDia)
    const acumulados = new Map();
    let procesados = 0;

    for (const contrato of contratos) {
      try {
        const rutaArchivo = this.#parseDatos(contrato.datos).ruta_archivo;
        const df = this.#leerExcel(rutaArchivo);
        const sic = parseInt(contrato.codigo_sic, 10);
        const dfSic = df.filter((r) => parseInt(r.SIC, 10) === sic);
        if (dfSic.length === 0) continue;

        for (let mes = mesInicial; mes <= mesFinal; mes++) {
          const anoMes = parseInt(`${anio}${String(mes).padStart(2, "0")}`, 10);
          const dfMes = dfSic.filter((r) => parseInt(r.ANO_MES, 10) === anoMes);

          for (const tipoCodigo of TIPOS_DIA) {
            const dfTipo = dfMes.filter((r) => r.TIPO_DIA === tipoCodigo);
            if (dfTipo.length > 0) {
              const clave = `${mes}|${tipoCodigo}`;
              if (!acumulados.has(clave)) {
                const inicial = { DIAS: 0 };
                for (let h = 1; h <= 24; h++) inicial[`H${h}`] = 0;
                acumulados.set(clave, inicial);
              }
              const acc = acumulados.get(clave);
              const origen = dfTipo[0];
              if (acc.DIAS === 0 && origen.DIAS != null) acc.DIAS = Number(origen.DIAS);
              for (let h = 1; h <= 24; h++) {
                const valor = origen[`EH${h}`];
                if (valor != null) acc[`H${h}`] += Number(valor);
              }
            }
          }
        }
        procesados++;
      } catch (err) {
        Logger.error(`Error procesando contrato SIC ${contrato.codigo_sic}: ${err.message}`);
      }
    }

    if (procesados === 0) {
      throw new ServiceError("No se pudo procesar ningún contrato para obtener detalles", 500);
    }

    const filas = [];
    for (let mes = mesInicial; mes <= mesFinal; mes++) {
      for (const tipoCodigo of TIPOS_DIA) {
        const clave = `${mes}|${tipoCodigo}`;
        if (acumulados.has(clave)) {
          const datos = acumulados.get(clave);
          const numDias = datos.DIAS;
          const diasStr = numDias > 0
            ? `${NOMBRE_TIPO_DIA[tipoCodigo]}: ${numDias}`
            : NOMBRE_TIPO_DIA[tipoCodigo];
          const fila = { AÑO: anio, MES: mes, DÍAS: diasStr };
          for (let h = 1; h <= 24; h++) fila[`H${h}`] = Number(datos[`H${h}`]);
          filas.push(fila);
        }
      }
    }

    return { columnas: COLUMNAS_DETALLE, filas };
  };

  // ─── Energía simplificada de un contrato (fechas + demandas) ──────────────────

  obtenerEnergiaContrato = async (sic, anio, mesInicial, mesFinal) => {
    const contrato = await this.#model.getContratoBySicAnio(String(sic), anio);
    if (!contrato) {
      throw new ServiceError(`No se encontró contrato con SIC ${sic} para el año ${anio}`, 404);
    }

    const rutaArchivo = this.#parseDatos(contrato.datos).ruta_archivo;
    const df = this.#leerExcel(rutaArchivo);
    const sicNumerico = parseInt(sic, 10);
    const dfSic = df.filter((r) => parseInt(r.SIC, 10) === sicNumerico);

    const fechas = [];
    const demandas = [];
    for (let mes = mesInicial; mes <= mesFinal; mes++) {
      const anoMes = parseInt(`${anio}${String(mes).padStart(2, "0")}`, 10);
      const dfMes = dfSic.filter((r) => parseInt(r.ANO_MES, 10) === anoMes);
      if (dfMes.length > 0) {
        let energiaTotal = 0;
        for (const tipoDia of TIPOS_DIA) {
          const dfTipo = dfMes.filter((r) => r.TIPO_DIA === tipoDia);
          for (const fila of dfTipo) {
            for (let h = 1; h <= 24; h++) {
              const valor = fila[`EH${h}`];
              if (valor != null) energiaTotal += Number(valor);
            }
          }
        }
        fechas.push(`${anio}-${String(mes).padStart(2, "0")}`);
        demandas.push(energiaTotal);
      }
    }

    return { fechas, demandas };
  };

  // ─── Porcentaje de cubrimiento ────────────────────────────────────────────────

  guardarPorcentajeCubrimiento = async (porcentaje) => {
    const { anio, valores } = porcentaje;
    if (!Array.isArray(valores) || valores.length !== 12) {
      throw new ServiceError("Se requieren 12 valores (uno por cada mes)", 400);
    }
    await this.#model.savePorcentaje(anio, valores);
    return { anio, valores };
  };

  obtenerPorcentajeCubrimiento = async (anio) => {
    const rows = await this.#model.getPorcentajeByAnio(anio);
    if (!rows.length) {
      return { anio, valores: new Array(12).fill(90) };
    }
    return { anio, valores: rows.map((p) => p.valor) };
  };

  // ─── Pronóstico guardado (perfil) ─────────────────────────────────────────────

  obtenerPronosticoDemanda = async (modelId) => {
    const modelo = await this.#demanda.retrieveModelValues(modelId);
    return {
      fechas: modelo.dates || [],
      demandas: modelo.values || [],
    };
  };

  listarModelosDisponibles = async (userId, sessionId) => {
    return this.#demanda.listUserModels(userId, sessionId);
  };
}