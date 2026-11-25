import colors from "colors";
import Logger from "../helpers/logger.js";
import { createConectionPG } from "../helpers/connections.js";
import AjustesModel from "../models/ajustes.model.js";
import { sumarDiasISO as sumarDias } from "../helpers/utils.js";
import {
  UCP_PATTERN,
  RUTAS_EPM,
  EPM_URL_DEFAULT,
  TIMEOUT_LARGO,
  UCPS_DEFAULT,
} from "./ajustes.whitelist.js";

// Servicio intermedio de la Mesa de ajustes: reenvía a EPM (/adjustments/*) SOLO lo ya validado por la
// whitelist y arma `pronostico-emitido`/`reales` desde la BD del mercado (solo lectura).
// Nunca loguea cuerpos (curvas) ni el token de servicio.

export class AjustesError extends Error {
  constructor(status, message, detail = message) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

const N_PERIODOS = 24;
const MAX_TEXTO_ERROR = 300;
const MSG_GENERICO = "Error en la API de ajustes";
const MSG_NO_CONFIGURADA = "La API de ajustes no está configurada";

/**
 * Modo estricto (producción): sin token o sin URL de EPM NO se reenvía nada (falla cerrado).
 * Estricto si NODE_ENV=production o AJUSTES_ESTRICTO=1/true; AJUSTES_ESTRICTO=0/false lo desactiva explícitamente.
 */
export function modoEstricto(env) {
  const explicito = String(env.AJUSTES_ESTRICTO ?? "").trim().toLowerCase();
  if (["1", "true"].includes(explicito)) return true;
  if (["0", "false"].includes(explicito)) return false;
  return env.NODE_ENV === "production";
}

/**
 * `detail` que se entrega al navegador. 4xx: tal cual (el front necesita 409/422 estructurados: versiones, bloqueos).
 * >=500: solo un mensaje saneado (sin `causa`/trazas/campos internos de EPM).
 */
export function detailSaneado(status, detail) {
  if (status < 500) return detail ?? null;
  return mensajeDeDetail(detail, MSG_GENERICO).slice(0, MAX_TEXTO_ERROR);
}

/** `message` legible según el contrato: detail string → él; objeto con `mensaje` → ese; lista FastAPI → sus `msg`. */
export function mensajeDeDetail(detail, porDefecto = MSG_GENERICO) {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail) && typeof detail.mensaje === "string") {
    return detail.mensaje;
  }
  if (Array.isArray(detail)) {
    const msgs = detail.map((d) => (typeof d === "string" ? d : d?.msg)).filter(Boolean);
    if (msgs.length) return msgs.join("; ");
  }
  return porDefecto;
}

const numeroOnull = (v) => {
  const n = v === null || v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
};

export const lunesDe = (iso) => {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return sumarDias(iso, -((dow + 6) % 7));
};

// Hoy en Colombia (UTC-5, sin DST) como YYYY-MM-DD.
export const hoyBogota = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);

const curvaCompleta = (curva) => curva.every((v) => v !== null && v >= 0);

const curvaDeFila = (fila) =>
  Array.from({ length: N_PERIODOS }, (_, i) => numeroOnull(fila[`p${i + 1}`]));

export function crearServicioAjustes(deps = {}) {
  const env = deps.env ?? process.env;
  const hoy = deps.hoy ?? hoyBogota;
  const fetchImpl = deps.fetch ?? ((...args) => globalThis.fetch(...args));
  const model = deps.model ?? AjustesModel.getInstance();
  const conectar = deps.conectar ?? createConectionPG;

  // Aviso de "sin token" una sola vez por servicio (no global del módulo).
  let avisoSinToken = false;

  /** fetch con timeout (el temporizador cubre también la lectura del cuerpo); lanza AjustesError 502 si EPM no responde. */
  async function fetchConTimeout(clave, url, init, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const respuesta = await fetchImpl(url, { ...init, signal: controller.signal });
      const texto = await respuesta.text();
      return { respuesta, texto };
    } catch (error) {
      Logger.error(colors.red(`[ajustes] EPM no respondió (${clave}): ${error?.name ?? "error"}`));
      throw new AjustesError(502, "La API de ajustes no respondió");
    } finally {
      clearTimeout(timer);
    }
  }

  const urlEpm = () => (env.EPM_AJUSTES_URL || EPM_URL_DEFAULT).replace(/\/+$/, "");

  // --- UCP habilitadas ----------------------------------------------------
  const ucpsHabilitadas = () => {
    if (!env.AJUSTES_UCPS) return UCPS_DEFAULT;
    try {
      const lista = JSON.parse(env.AJUSTES_UCPS);
      const ok =
        Array.isArray(lista) &&
        lista.length > 0 &&
        lista.every((u) => u && typeof u.ucp === "string" && UCP_PATTERN.test(u.ucp) && typeof u.nombre === "string");
      if (ok) return lista.map(({ ucp, nombre }) => ({ ucp, nombre }));
    } catch (_) {
      /* cae al default */
    }
    Logger.warn("[ajustes] AJUSTES_UCPS inválida: se usa la lista por defecto");
    return UCPS_DEFAULT;
  };

  const verificarUcp = (ucp) => {
    const hab = ucpsHabilitadas().find((u) => u.ucp.toLowerCase() === String(ucp).toLowerCase());
    if (!hab) throw new AjustesError(422, `UCP no habilitada en la mesa de ajustes: ${ucp}`);
    return hab.ucp; // nombre canónico EPM
  };

  // --- Llamada a EPM ------------------------------------------------------
  /**
   * @param {keyof RUTAS_EPM} clave fila de la tabla fija
   * @param {{ruta?:Record<string,string|number>, query?:object, body?:object, timeout?:number}} op
   * @returns {Promise<{status:number, data:any}>} lanza AjustesError si EPM responde error o no responde.
   */
  async function llamarEpm(clave, { ruta = {}, query, body, timeout } = {}) {
    const def = RUTAS_EPM[clave];
    if (!def) throw new AjustesError(500, "Ruta de ajustes no registrada");
    const token = env.AJUSTES_SERVICE_TOKEN;
    if (modoEstricto(env) && (!token || !env.EPM_AJUSTES_URL)) {
      const faltan = [!token && "AJUSTES_SERVICE_TOKEN", !env.EPM_AJUSTES_URL && "EPM_AJUSTES_URL"].filter(Boolean);
      Logger.error(colors.red(`[ajustes] modo estricto: falta ${faltan.join(" y ")}; no se reenvía a EPM`));
      throw new AjustesError(503, MSG_NO_CONFIGURADA, MSG_NO_CONFIGURADA);
    }
    let path = def.epm.replace(/:(\w+)/g, (_, k) => encodeURIComponent(String(ruta[k])));
    if (query) {
      const qs = new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]),
      ).toString();
      if (qs) path += `?${qs}`;
    }
    const headers = { Accept: "application/json" };
    if (token) headers["X-Ajustes-Token"] = token;
    else if (!avisoSinToken) {
      avisoSinToken = true;
      Logger.warn("[ajustes] AJUSTES_SERVICE_TOKEN no definido: se llama a EPM sin X-Ajustes-Token");
    }
    const init = { method: def.metodo, headers };
    if (body !== undefined && def.metodo !== "GET") {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const { respuesta, texto } = await fetchConTimeout(clave, `${urlEpm()}${path}`, init, timeout ?? def.timeout);

    let cuerpo; // undefined = el cuerpo no es JSON
    try {
      cuerpo = texto ? JSON.parse(texto) : null;
    } catch (_) {
      /* cuerpo no JSON */
    }
    if (!respuesta.ok) {
      const detail = cuerpo && typeof cuerpo === "object" && "detail" in cuerpo ? cuerpo.detail : cuerpo;
      // Texto crudo (no JSON), de cualquier status: no se reenvía (puede traer trazas/HTML de un proxy).
      const limpio = cuerpo === undefined ? null : detail;
      throw new AjustesError(respuesta.status, mensajeDeDetail(limpio, MSG_GENERICO).slice(0, MAX_TEXTO_ERROR), detailSaneado(respuesta.status, limpio));
    }
    if (cuerpo === undefined) cuerpo = null;
    return { status: def.exito, data: cuerpo };
  }

  // --- Usuario de la sesión -----------------------------------------------
  async function usuarioDeSesion(user) {
    const userId = user?.userId ?? null;
    if (userId === null || userId === undefined) {
      throw new AjustesError(401, "Sesión sin usuario identificable");
    }
    try {
      const nombre = await model.nombreUsuario(userId, conectar(user.session));
      if (nombre) return String(nombre).slice(0, 120);
    } catch (_) {
      /* el nombre es informativo: se cae al id */
    }
    return `usuario-${userId}`;
  }

  // --- Operaciones de la tabla ------------------------------------------------
  const sinUsuario = ({ usuario: _u, aplicar_automatico: _a, ...resto } = {}) => resto;

  const cuerpoRun = (body) => ({ ...sinUsuario(body), ucp: verificarUcp(body.ucp) });

  const previewCorrida = (body) => llamarEpm("preview", { body: cuerpoRun(body) });

  async function crearCorrida(body, user) {
    const usuario = await usuarioDeSesion(user);
    return llamarEpm("run", { body: { ...cuerpoRun(body), usuario } });
  }

  const aprobada = (q) => llamarEpm("aprobada", { query: { ucp: verificarUcp(q.ucp), semana_inicio: q.semana_inicio } });
  const corrida = ({ id }) => llamarEpm("corrida", { ruta: { id } });
  const versiones = ({ id }) => llamarEpm("versiones", { ruta: { id } });
  const version = ({ id, version: v }) => llamarEpm("version", { ruta: { id, version: v } });

  async function patchPaso({ id, paso }, body, user) {
    const usuario = await usuarioDeSesion(user);
    // base + aplicado re-ejecuta el modelo (lento).
    const timeout = paso === "base" && body.estado === "aplicado" ? TIMEOUT_LARGO : undefined;
    return llamarEpm("patchPaso", { ruta: { id, paso }, body: { ...sinUsuario(body), usuario }, timeout });
  }

  async function aprobar({ id }, body, user) {
    const usuario = await usuarioDeSesion(user);
    return llamarEpm("aprobar", { ruta: { id }, body: { ...sinUsuario(body), usuario } });
  }

  const analogos = (body) => llamarEpm("analogos", { body: { ...body, ucp: verificarUcp(body.ucp) } });

  const acumuladoAnual = (q) => llamarEpm("acumuladoAnual", { query: { ...q, ucp: verificarUcp(q.ucp) } });

  /**
   * P1 "Lo que aprendió": arma emisiones ex-ante y reales y los envía a EPM. Solo lectura; no modifica nada.
   * Regla ex-ante (ver querys.emisionesRetro): solo tipo 'P', por FECHA, sesión de menor codigo guardada >= 3 días antes.
   * Ventana anclada al último día real completo (el real llega con rezago): desde = lunes(último real) - 7*semanas.
   * Si no hay real o emisión se envía vacío (EPM responde sin_datos) y no se mandan reales sin emisión.
   */
  async function aprendizajeError({ ucp, semanas }, user) {
    const u = verificarUcp(ucp);
    const ultimoReal = await model.ultimoRealHasta(u, sumarDias(hoy(), 1), conectar(user.session));
    const vacio = () => llamarEpm("aprendizajeError", { body: { ucp: u, semanas, emisiones: [], reales: {} } });
    if (!ultimoReal) return vacio();
    const desde = sumarDias(lunesDe(ultimoReal), -7 * semanas);
    const [filas, filasReales] = await Promise.all([
      model.emisionesRetro(u, desde, ultimoReal, conectar(user.session)),
      model.realesRetro(u, desde, ultimoReal, conectar(user.session)),
    ]);

    // Las filas llegan ordenadas por fecha (SQL). Se agrupan por lunes; solo días con los 24 periodos presentes y >= 0.
    const semanasMap = new Map(); // lunes -> {version (mínima), curvas}
    for (const fila of filas) {
      const curva = curvaDeFila(fila);
      if (!curvaCompleta(curva)) continue;
      const lunes = lunesDe(fila.fecha);
      const version = numeroOnull(fila.version);
      const sem = semanasMap.get(lunes) ?? { version, curvas: {} };
      if (version !== null && (sem.version === null || version < sem.version)) sem.version = version;
      sem.curvas[fila.fecha] = curva;
      semanasMap.set(lunes, sem);
    }
    const emisiones = [...semanasMap].map(([semana_inicio, { version, curvas }]) => ({ semana_inicio, version, curvas }));
    if (!emisiones.length) return vacio();

    // Reales: la última fila por fecha gana (orden fecha, codigo); si esa fila está incompleta el día se descarta.
    const ultimaPorFecha = new Map();
    for (const fila of filasReales) ultimaPorFecha.set(fila.fecha, curvaDeFila(fila));
    const conEmision = new Set(emisiones.flatMap((e) => Object.keys(e.curvas)));
    const realesData = {};
    for (const [fecha, curva] of ultimaPorFecha) {
      if (conEmision.has(fecha) && curvaCompleta(curva)) realesData[fecha] = curva;
    }
    return llamarEpm("aprendizajeError", { body: { ucp: u, semanas, emisiones, reales: realesData } });
  }

  // --- Datos de Sphere (BD, solo lectura) ----------------------------------------
  async function reales({ ucp, desde, hasta }, user) {
    const u = verificarUcp(ucp);
    const filas = await model.reales(u, desde, hasta, conectar(user.session));
    const data = {};
    for (const fila of filas) {
      const curva = curvaDeFila(fila);
      if (curva.some((v) => v !== null)) data[fila.fecha] = curva;
    }
    return { status: 200, data };
  }

  async function pronosticoEmitido({ ucp, semana_inicio: lunes }, user) {
    const u = verificarUcp(ucp);
    const domingo = sumarDias(lunes, 6);
    const sesion = await model.sesionEmitida({ ucp: u, desde: lunes, hasta: domingo }, conectar(user.session));
    if (!sesion) throw new AjustesError(404, "No hay pronóstico emitido para esa semana");

    // corte = último dato real anterior a la emisión (EPM: base_curvas cubre corte+1..domingo).
    const corte = await model.ultimoRealHasta(u, sesion.fecha_sesion, conectar(user.session));
    if (!corte) throw new AjustesError(404, "No hay datos reales previos a la emisión del pronóstico");
    if (corte >= lunes) throw new AjustesError(422, "La semana objetivo ya está observada");
    const primero = sumarDias(corte, 1);

    const filas = await model.periodosSesion(sesion.codigo, primero, domingo, conectar(user.session));
    const porFecha = new Map(); // P gana a PM (P = lo reportado; PM = resto del período)
    for (const fila of filas) {
      const previa = porFecha.get(fila.fecha);
      if (!previa || (previa.tipo !== "P" && fila.tipo === "P")) porFecha.set(fila.fecha, fila);
    }
    const base_curvas = {};
    const faltan = [];
    for (let d = primero; d <= domingo; d = sumarDias(d, 1)) {
      const fila = porFecha.get(d);
      const curva = fila ? curvaDeFila(fila) : null;
      if (!curva || curva.some((v) => v === null)) faltan.push(d);
      else base_curvas[d] = curva;
    }
    if (faltan.length) {
      throw new AjustesError(404, "El pronóstico emitido no cubre todos los días necesarios", {
        mensaje: "El pronóstico emitido no cubre todos los días necesarios",
        faltan,
      });
    }
    return {
      status: 200,
      data: {
        base_ref: `sphere:sesion:${sesion.codigo}`,
        fecha_emision: sesion.fecha_sesion,
        modelo_version: `sphere:${sesion.nombre} v${sesion.version}`,
        base_curvas,
        // aditivo: trazabilidad (la sesión puede venir ya ajustada por un analista, no solo del modelo)
        sesion: {
          codigo: sesion.codigo,
          nombre: sesion.nombre,
          version: sesion.version,
          observacion: sesion.observacion ?? null,
        },
      },
    };
  }

  return {
    ucps: () => ({ status: 200, data: ucpsHabilitadas() }),
    reales,
    pronosticoEmitido,
    previewCorrida,
    crearCorrida,
    aprobada,
    corrida,
    versiones,
    version,
    patchPaso,
    aprobar,
    analogos,
    acumuladoAnual,
    aprendizajeError,
  };
}

// Singleton por proceso; los controladores lo resuelven por petición (ver access/index.js).
let instancia = null;
export default function servicioAjustes() {
  if (!instancia) instancia = crearServicioAjustes();
  return instancia;
}

/** SOLO PARA PRUEBAS (no usar en producción): fija (o limpia con null) el servicio que usan los controladores. */
export function fijarServicioAjustes(servicio) {
  instancia = servicio;
}
