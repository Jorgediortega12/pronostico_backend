import Logger from "../../../../../../../helpers/logger.js";
import servicioAjustes, {
  AjustesError,
} from "../../../../../../../services/ajustes.service.js";

// Controladores finos: la whitelist ya validó (access/validar.js) y dejó el valor limpio en req.ajustes.
// Envoltorio del contrato: { success:true, data } / { success:false, message, detail } con el MISMO status de EPM.

const responder = (res, { status, data }) => res.status(status).json({ success: true, data });

const responderError = (res, error) => {
  if (error instanceof AjustesError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      detail: error.detail ?? null,
    });
  }
  Logger.error("[ajustes] error no controlado", error?.message);
  return res.status(500).json({
    success: false,
    message: "Error interno de la mesa de ajustes",
    detail: null,
  });
};

// `servicio` se resuelve por petición para poder inyectar uno de prueba (tests) sin tocar el router.
const manejar = (fn) => async (req, res) => {
  try {
    responder(res, await fn(servicioAjustes(), req));
  } catch (error) {
    responderError(res, error);
  }
};

export const ucps = manejar((s) => s.ucps());
export const pronosticoEmitido = manejar((s, req) => s.pronosticoEmitido(req.ajustes.query, req.user));
export const reales = manejar((s, req) => s.reales(req.ajustes.query, req.user));
export const preview = manejar((s, req) => s.previewCorrida(req.ajustes.body));
export const run = manejar((s, req) => s.crearCorrida(req.ajustes.body, req.user));
export const aprobada = manejar((s, req) => s.aprobada(req.ajustes.query));
export const corrida = manejar((s, req) => s.corrida(req.ajustes.params));
export const versiones = manejar((s, req) => s.versiones(req.ajustes.params));
export const version = manejar((s, req) => s.version(req.ajustes.params));
export const patchPaso = manejar((s, req) => s.patchPaso(req.ajustes.params, req.ajustes.body, req.user));
export const aprobar = manejar((s, req) => s.aprobar(req.ajustes.params, req.ajustes.body, req.user));
export const analogos = manejar((s, req) => s.analogos(req.ajustes.body));
export const acumuladoAnual = manejar((s, req) => s.acumuladoAnual(req.ajustes.query));
