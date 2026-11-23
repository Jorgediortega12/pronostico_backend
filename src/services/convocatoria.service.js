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

  // Los archivos se guardan por empresa (BASE_PATH/<base de datos>/<carpeta>/...): los id se repiten entre bases y, en una
  // carpeta compartida, un archivo de una empresa pisaría el de otra.
  #dirBase = (session) => {
    const bd = String(session?.basededatos ?? "").replace(/[^A-Za-z0-9_-]/g, "");
    if (!bd) throw new ServiceError("Sesión sin base de datos del mercado. Vuelve a iniciar sesión.", 401);
    return path.join(BASE_PATH, bd);
  };

  #rutaArchivo = (carpeta, id, nombreArchivo, session) =>
    path.join(this.#dirBase(session), carpeta, `${id}_${nombreArchivo}`);

  // Antes todo se guardaba en una carpeta plana (BASE_PATH/<carpeta>/...), que solo pertenece a la base por defecto del
  // servidor (POSTGRES_DB): únicamente para esa base se siguen reconociendo esos archivos.
  #rutaExistente = (carpeta, id, nombreArchivo, session) => {
    const nueva = this.#rutaArchivo(carpeta, id, nombreArchivo, session);
    if (fs.existsSync(nueva)) return nueva;
    if (session?.basededatos && session.basededatos === process.env.POSTGRES_DB) {
      const legada = path.join(BASE_PATH, carpeta, `${id}_${nombreArchivo}`);
      if (fs.existsSync(legada)) return legada;
    }
    return null;
  };

  // ─── Convocatorias ─────────────────────────────────────────────────────────

  getConvocatorias = async (session) => {
    return this.#model.getConvocatorias(session);
  };

  crearConvocatoria = async ({ nombre, mercado, fecha_audiencia }, session) => {
    return this.#model.insertConvocatoria(session, nombre, mercado, fecha_audiencia);
  };

  // ─── Contratos ──────────────────────────────────────────────────────────────

  getContratos = async (convocatoriaId, session) => {
    return this.#model.getContratosByConvocatoria(session, convocatoriaId);
  };

  crearContrato = async (datos, session) => {
    // El origen usa campos en MAYÚSCULA (CONVOCATORIA_ID, DESCRIPCION, ...)
    // y el codigo se autogenera (SERIAL), ignorando el CODIGO enviado.
    return this.#model.insertContrato(session, datos.CONVOCATORIA_ID,
      datos.DESCRIPCION ?? null,
      datos.FECHA_INICIO,
      datos.FECHA_FIN);
  };

  actualizarAgente = async (datos, session) => {
    const codigo = datos.CODIGO;
    const contrato = await this.#model.getContratoActivoByCodigo(session, codigo);
    if (!contrato) throw new ServiceError("ContratoConvocatoria no encontrado", 400);

    const setObj = {};
    for (const [form, col] of Object.entries(CAMPOS_AGENTE)) {
      if (datos[form] !== undefined && datos[form] !== null) {
        setObj[col] = datos[form];
      }
    }
    return this.#model.updateAgente(session, codigo, setObj);
  };

  getAgente = async (codigo, session) => {
    const agente = await this.#model.getAgenteByCodigo(session, codigo);
    if (!agente) throw new ServiceError("ContratoConvocatoria no encontrado", 400);
    return agente;
  };

  getContrato = async (codigo, session) => {
    const contrato = await this.#model.getContratoByCodigo(session, codigo);
    if (!contrato) throw new ServiceError("Contrato no encontrado", 404);
    return contrato;
  };

  // ─── Archivos ─────────────────────────────────────────────────────────────────

  listarArchivos = async (contratoCodigo, carpeta, session) => {
    const meta = this.#getCarpeta(carpeta);
    return this.#model.getArchivosByContrato(session, meta.tabla, contratoCodigo);
  };

  // Devuelve { ruta, nombre } para que el controller haga res.download
  descargarArchivo = async (carpeta, id, session) => {
    const meta = this.#getCarpeta(carpeta);
    const archivo = await this.#model.getArchivoById(session, meta.tabla, id);
    if (!archivo) throw new ServiceError("Archivo no encontrado", 404);

    const ruta = this.#rutaExistente(carpeta, archivo.id, archivo.nombre_archivo, session);
    if (!ruta) {
      throw new ServiceError("Archivo no encontrado en el servidor", 404);
    }
    return { ruta, nombre: archivo.nombre_archivo };
  };

  subirArchivo = async (datos, file, session) => {
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

    const registro = await this.#model.insertArchivo(session, meta.tabla, valuesObj);

    // Escribir el archivo físico: {base}/{carpeta}/{id}_{nombre_archivo}
    try {
      const dir = path.join(this.#dirBase(session), carpeta);
      fs.mkdirSync(dir, { recursive: true });
      const ruta = this.#rutaArchivo(carpeta, registro.id, registro.nombre_archivo, session);
      fs.writeFileSync(ruta, file.buffer);
    } catch (err) {
      Logger.error(`Error al guardar archivo de ${carpeta}: ${err.message}`);
      throw new ServiceError(`Error al guardar el archivo: ${err.message}`, 500);
    }

    return registro;
  };

  actualizarArchivo = async (datos, file, session) => {
    const carpeta = datos.CARPETA;
    const columnasPermitidas = CARPETAS_ACTUALIZABLES[carpeta];
    if (!columnasPermitidas) throw new ServiceError("Carpeta no válida", 400);
    const meta = this.#getCarpeta(carpeta);
    if (!file) throw new ServiceError("No se proporcionó ningún archivo (ARCHIVO)", 422);

    const id = parseInt(datos.ID, 10);
    const archivo = await this.#model.getArchivoById(session, meta.tabla, id);
    if (!archivo) throw new ServiceError("Archivo no encontrado", 404);

    const pathAntiguo = this.#rutaExistente(carpeta, archivo.id, archivo.nombre_archivo, session);

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

    const actualizado = await this.#model.updateArchivo(session, meta.tabla, id, setObj);

    // Reemplazar el archivo físico
    try {
      const dir = path.join(this.#dirBase(session), carpeta);
      fs.mkdirSync(dir, { recursive: true });
      if (pathAntiguo && fs.existsSync(pathAntiguo)) fs.unlinkSync(pathAntiguo);
      const pathNuevo = this.#rutaArchivo(carpeta, actualizado.id, actualizado.nombre_archivo, session);
      fs.writeFileSync(pathNuevo, file.buffer);
    } catch (err) {
      Logger.error(`Error al reemplazar archivo de ${carpeta}: ${err.message}`);
      throw new ServiceError(`Error al reemplazar el archivo: ${err.message}`, 500);
    }

    return actualizado;
  };
}