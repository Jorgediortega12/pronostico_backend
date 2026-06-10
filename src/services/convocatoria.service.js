import fs from "fs";
import path from "path";
import ConvocatoriaModel from "../models/convocatoria.model.js";
import { CARPETAS, CARPETAS_ACTUALIZABLES, CAMPOS_AGENTE } from "../querys/convocatoria.query.js";
import Logger from "../helpers/logger.js";

class ServiceError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

const BASE_PATH = path.join(process.cwd(), "archivosConvocatoria");

const castValor = (valor, tipo) => {
  if (valor === undefined || valor === null || valor === "") return null;
  switch (tipo) {
    case "int":
      return parseInt(valor, 10);
    case "num":
      return Number(valor);
    case "date":
      return new Date(valor);
    default:
      return String(valor);
  }
};

export default class ConvocatoriaService {
  static instance;
  static getInstance() {
    if (!ConvocatoriaService.instance) {
      ConvocatoriaService.instance = new ConvocatoriaService();
    }
    return ConvocatoriaService.instance;
  }

  #model = ConvocatoriaModel.getInstance();

  #getCarpeta = (carpeta) => {
    const meta = CARPETAS[carpeta];
    if (!meta) throw new ServiceError("Carpeta no válida", 400);
    return meta;
  };

  #rutaArchivo = (carpeta, id, nombreArchivo) =>
    path.join(BASE_PATH, carpeta, `${id}_${nombreArchivo}`);

  // ─── Convocatorias ─────────────────────────────────────────────────────────

  getConvocatorias = async () => {
    return this.#model.getConvocatorias();
  };

  crearConvocatoria = async ({ nombre, mercado, fecha_audiencia }) => {
    return this.#model.insertConvocatoria(nombre, mercado, fecha_audiencia);
  };

  // ─── Contratos ──────────────────────────────────────────────────────────────

  getContratos = async (convocatoriaId) => {
    return this.#model.getContratosByConvocatoria(convocatoriaId);
  };

  crearContrato = async (datos) => {
    // El origen usa campos en MAYÚSCULA (CONVOCATORIA_ID, DESCRIPCION, ...)
    // y el codigo se autogenera (SERIAL), ignorando el CODIGO enviado.
    return this.#model.insertContrato(
      datos.CONVOCATORIA_ID,
      datos.DESCRIPCION ?? null,
      datos.FECHA_INICIO,
      datos.FECHA_FIN
    );
  };

  actualizarAgente = async (datos) => {
    const codigo = datos.CODIGO;
    const contrato = await this.#model.getContratoActivoByCodigo(codigo);
    if (!contrato) throw new ServiceError("ContratoConvocatoria no encontrado", 400);

    const setObj = {};
    for (const [form, col] of Object.entries(CAMPOS_AGENTE)) {
      if (datos[form] !== undefined && datos[form] !== null) {
        setObj[col] = datos[form];
      }
    }
    return this.#model.updateAgente(codigo, setObj);
  };

  getAgente = async (codigo) => {
    const agente = await this.#model.getAgenteByCodigo(codigo);
    if (!agente) throw new ServiceError("ContratoConvocatoria no encontrado", 400);
    return agente;
  };

  getContrato = async (codigo) => {
    const contrato = await this.#model.getContratoByCodigo(codigo);
    if (!contrato) throw new ServiceError("Contrato no encontrado", 404);
    return contrato;
  };

  // ─── Archivos ─────────────────────────────────────────────────────────────────

  listarArchivos = async (contratoCodigo, carpeta) => {
    const meta = this.#getCarpeta(carpeta);
    return this.#model.getArchivosByContrato(meta.tabla, contratoCodigo);
  };

  // Devuelve { ruta, nombre } para que el controller haga res.download
  descargarArchivo = async (carpeta, id) => {
    const meta = this.#getCarpeta(carpeta);
    const archivo = await this.#model.getArchivoById(meta.tabla, id);
    if (!archivo) throw new ServiceError("Archivo no encontrado", 404);

    const ruta = this.#rutaArchivo(carpeta, archivo.id, archivo.nombre_archivo);
    if (!fs.existsSync(ruta)) {
      throw new ServiceError("Archivo no encontrado en el servidor", 404);
    }
    return { ruta, nombre: archivo.nombre_archivo };
  };

  subirArchivo = async (datos, file) => {
    const carpeta = datos.CARPETA;
    const meta = this.#getCarpeta(carpeta);
    if (!file) throw new ServiceError("No se proporcionó ningún archivo (ARCHIVO)", 422);

    // Construir valores a insertar a partir del registro de campos de la categoría
    const valuesObj = {};
    for (const campo of meta.campos) {
      const valor = castValor(datos[campo.form], campo.tipo);
      if (valor === null && campo.requerido) {
        throw new ServiceError(`Falta el campo requerido: ${campo.form}`, 422);
      }
      if (valor !== null) valuesObj[campo.col] = valor;
    }

    const registro = await this.#model.insertArchivo(meta.tabla, valuesObj);

    // Escribir el archivo físico: {base}/{carpeta}/{id}_{nombre_archivo}
    try {
      const dir = path.join(BASE_PATH, carpeta);
      fs.mkdirSync(dir, { recursive: true });
      const ruta = this.#rutaArchivo(carpeta, registro.id, registro.nombre_archivo);
      fs.writeFileSync(ruta, file.buffer);
    } catch (err) {
      Logger.error(`Error al guardar archivo de ${carpeta}: ${err.message}`);
      throw new ServiceError(`Error al guardar el archivo: ${err.message}`, 500);
    }

    return registro;
  };

  actualizarArchivo = async (datos, file) => {
    const carpeta = datos.CARPETA;
    const columnasPermitidas = CARPETAS_ACTUALIZABLES[carpeta];
    if (!columnasPermitidas) throw new ServiceError("Carpeta no válida", 400);
    const meta = this.#getCarpeta(carpeta);
    if (!file) throw new ServiceError("No se proporcionó ningún archivo (ARCHIVO)", 422);

    const id = parseInt(datos.ID, 10);
    const archivo = await this.#model.getArchivoById(meta.tabla, id);
    if (!archivo) throw new ServiceError("Archivo no encontrado", 404);

    const pathAntiguo = this.#rutaArchivo(carpeta, archivo.id, archivo.nombre_archivo);

    // Construir SET con los campos permitidos provistos (mapeo form UPPER -> col lower)
    const setObj = { fecha_carga: new Date() };
    const mapForm = {
      NOMBRE_ARCHIVO: "nombre_archivo",
      TIPO: "tipo",
      FECHA_INICIO: "fecha_inicio",
      ACCION: "accion",
    };
    for (const [form, col] of Object.entries(mapForm)) {
      if (!columnasPermitidas.includes(col)) continue;
      if (datos[form] !== undefined && datos[form] !== null && datos[form] !== "") {
        setObj[col] = col === "fecha_inicio" ? new Date(datos[form]) : datos[form];
      }
    }
    if (meta.version) {
      setObj.version = (parseInt(archivo.version, 10) || 0) + 1;
    }

    const actualizado = await this.#model.updateArchivo(meta.tabla, id, setObj);

    // Reemplazar el archivo físico
    try {
      const dir = path.join(BASE_PATH, carpeta);
      fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(pathAntiguo)) fs.unlinkSync(pathAntiguo);
      const pathNuevo = this.#rutaArchivo(carpeta, actualizado.id, actualizado.nombre_archivo);
      fs.writeFileSync(pathNuevo, file.buffer);
    } catch (err) {
      Logger.error(`Error al reemplazar archivo de ${carpeta}: ${err.message}`);
      throw new ServiceError(`Error al reemplazar el archivo: ${err.message}`, 500);
    }

    return actualizado;
  };
}