import Joi from "joi";

export default {
  // ── Body (JSON) ─────────────────────────────────────────────────────────────
  crearConvocatoria: Joi.object({
    nombre: Joi.string().required(),
    mercado: Joi.string().required(),
    fecha_audiencia: Joi.date().required(),
  }),

  crearContrato: Joi.object({
    CODIGO: Joi.number().integer().optional(), // el origen lo ignora (codigo se autogenera)
    CONVOCATORIA_ID: Joi.number().integer().required(),
    DESCRIPCION: Joi.string().allow("", null),
    FECHA_INICIO: Joi.date().required(),
    FECHA_FIN: Joi.date().required(),
  }),

  actualizarAgente: Joi.object({
    CODIGO: Joi.number().integer().required(),
    SIC: Joi.number().integer().allow(null),
    AGENTE: Joi.string().allow("", null),
    RAZON_S: Joi.string().allow("", null),
    NIT: Joi.number().integer().allow(null),
    DIRECCION: Joi.string().allow("", null),
    CIUDAD: Joi.string().allow("", null),
    TELEFONO: Joi.alternatives(Joi.number(), Joi.string()).allow("", null),
    CODIGO_TERCERO: Joi.number().integer().allow(null),
  }),

  // ── Params ──────────────────────────────────────────────────────────────────
  contratosPorConvocatoria: Joi.object({
    convocatoria_id: Joi.number().integer().required(),
  }),

  agentePorCodigo: Joi.object({
    contrato_codigo: Joi.number().integer().required(),
  }),

  contratoPorCodigo: Joi.object({
    codigo: Joi.number().integer().required(),
  }),

  listarArchivos: Joi.object({
    contrato_codigo: Joi.number().integer().required(),
    carpeta: Joi.string().required(),
  }),

  descargarArchivo: Joi.object({
    carpeta: Joi.string().required(),
    id: Joi.number().integer().required(),
  }),
};