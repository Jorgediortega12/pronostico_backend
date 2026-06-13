import Logger from "../helpers/logger.js";
import MpmModel from "../models/mpm.model.js";
import dotenv from "dotenv";
dotenv.config();

const ML_PORT = parseInt(process.env.DEMANDA_ML_PORT || "8004");
const ML_TIMEOUT = parseInt(process.env.DEMANDA_ML_TIMEOUT || "120000");
const ML_HOSTS = ["127.0.0.1", "localhost"];
const ML_USER = process.env.DEMANDA_ML_USER || "";
const ML_PASSWORD = process.env.DEMANDA_ML_PASSWORD || "";

export default class MpmService {
  static instance;
  static getInstance() {
    if (!MpmService.instance) {
      MpmService.instance = new MpmService();
    }
    return MpmService.instance;
  }

  #model = MpmModel.getInstance();
  #mlToken = null;
  #mlTokenExpiry = 0;

  #getMlToken = async () => {
    if (this.#mlToken && Date.now() < this.#mlTokenExpiry) return this.#mlToken;

    if (!ML_USER || !ML_PASSWORD) {
      const err = new Error("Credenciales ML no configuradas");
      err.statusCode = 500;
      throw err;
    }

    const errors = [];
    for (const host of ML_HOSTS) {
      try {
        const res = await fetch(
          `http://${host}:${ML_PORT}/v1/autenticacion/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `username=${encodeURIComponent(ML_USER)}&password=${encodeURIComponent(ML_PASSWORD)}`,
          },
        );
        if (!res.ok) {
          const detail = await res.text();
          errors.push(
            `${host}:${ML_PORT} respondio ${res.status}${detail ? ` - ${detail}` : ""}`,
          );
          continue;
        }
        const data = await res.json();
        if (!data?.access_token) {
          errors.push(`${host}:${ML_PORT} no devolvio access_token`);
          continue;
        }
        this.#mlToken = data.access_token;
        this.#mlTokenExpiry = Date.now() + 11 * 60 * 60 * 1000; // 11h (token dura 12h)
        return this.#mlToken;
      } catch (err) {
        errors.push(`${host}:${ML_PORT} ${err.cause?.code || err.message}`);
      }
    }
    const err = new Error(
      `No se pudo autenticar con el servicio ML (${errors.join("; ")})`,
    );
    err.statusCode = errors.some((error) =>
      /respondio 401|respondio 403/.test(error),
    )
      ? 401
      : 503;
    throw err;
  };

  #callMlApi = async (
    method,
    endpoint,
    body = null,
    timeoutMs = ML_TIMEOUT,
  ) => {
    let token;
    try {
      token = await this.#getMlToken();
    } catch (err) {
      return {
        success: false,
        message: err.message,
        statusCode: err.statusCode || 503,
      };
    }
    for (const host of ML_HOSTS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`http://${host}:${ML_PORT}${endpoint}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          ...(body != null ? { body: JSON.stringify(body) } : {}),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          const text = await res.text();
          return { success: false, message: text, statusCode: res.status };
        }
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        clearTimeout(timer);
        if (err.name === "AbortError") {
          return {
            success: false,
            message: "Timeout al comunicarse con el servicio ML",
          };
        }
        if (host === ML_HOSTS[ML_HOSTS.length - 1]) {
          return { success: false, message: err.message };
        }
      }
    }
  };

  // ─── Helper: descarga binaria (Excel) ───────────────────────────────────────

  #callMlApiBinary = async (endpoint, body, timeoutMs = ML_TIMEOUT) => {
    let token;
    try {
      token = await this.#getMlToken();
    } catch (err) {
      return {
        success: false,
        message: err.message,
        statusCode: err.statusCode || 503,
      };
    }
    for (const host of ML_HOSTS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`http://${host}:${ML_PORT}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok)
          return {
            success: false,
            message: await res.text(),
            statusCode: res.status,
          };
        const buffer = await res.arrayBuffer();
        return {
          success: true,
          buffer,
          contentType: res.headers.get("content-type"),
        };
      } catch (err) {
        clearTimeout(timer);
        if (host === ML_HOSTS[ML_HOSTS.length - 1]) {
          return {
            success: false,
            message: err.name === "AbortError" ? "Timeout" : err.message,
          };
        }
      }
    }
  };

  #generateDbUrl = (session) => {
    const { host, usuario, contrasenia, puerto, basededatos } = session || {};
    if (!host || !usuario || !puerto || !basededatos) {
      throw new Error("Faltan parámetros de conexión a la base de datos en la sesión");
    }
    return contrasenia
      ? `postgresql://${usuario}:${contrasenia}@${host}:${puerto}/${basededatos}`
      : `postgresql://${usuario}@${host}:${puerto}/${basededatos}`;
  };

  // ─── Endpoints MPM ───────────────────────────────────────────────────────────

  verifyDocuments = async (session) => {
    const dbUrl = encodeURIComponent(this.#generateDbUrl(session));
    return this.#callMlApi("GET", `/v1/mpm/verify/documents/?database_url=${dbUrl}`);
  };

  getDemand = async (session, year, month, previousDays) => {
    const dbUrl = encodeURIComponent(this.#generateDbUrl(session));
    return this.#callMlApi(
      "GET",
      `/v1/mpm/demand/${year}/${month}/${previousDays}/?database_url=${dbUrl}`,
    );
  };

  predict = async (session, body) => {
    return this.#callMlApi("POST", "/v1/mpm/predict/", {
      ...body,
      database_url: this.#generateDbUrl(session),
    });
  };

  predictExcel = async (session, body) => {
    return this.#callMlApiBinary("/v1/mpm/predict/excel/", {
      ...body,
      database_url: this.#generateDbUrl(session),
    });
  };

  guardarVersion = async (session, { user_id, session_id, nombre, modelo_id, tipo_archivo, last_date, previous_days, payload }) => {
    const result = await this.#model.insertVersion(session, {
      userId: user_id,
      sessionId: session_id,
      nombre,
      modeloId: modelo_id,
      tipoArchivo: tipo_archivo,
      lastDate: last_date,
      previousDays: previous_days,
      payload,
    });
    return { message: "Versión guardada exitosamente", version_id: result.id, version: result.version };
  };

  listVersions = async (session, userId) => {
    const rows = await this.#model.listVersions(session, userId);
    return rows.map((v) => ({
      id: v.id,
      version: v.version,
      nombre: v.nombre,
      modelo_id: v.modelo_id,
      tipo_archivo: v.tipo_archivo,
      last_date: v.last_date ? new Date(v.last_date).toISOString().split("T")[0] : null,
      previous_days: v.previous_days,
      created_at: v.created_at,
    }));
  };

  loadVersion = async (session, versionId) => {
    const v = await this.#model.getVersionById(session, versionId);
    if (!v) throw new Error("La versión especificada no existe.");
    return {
      id: v.id,
      version: v.version,
      nombre: v.nombre,
      modelo_id: v.modelo_id,
      tipo_archivo: v.tipo_archivo,
      last_date: v.last_date ? new Date(v.last_date).toISOString().split("T")[0] : null,
      previous_days: v.previous_days,
      created_at: v.created_at,
      payload: v.payload,
    };
  };
}
