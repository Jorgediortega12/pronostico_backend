// Cron de carga de medidas desde la API de EPM (consulta 117) para el
// mercado/empresa EPM. Equivale a llamar a
//   GET /api/v1/admin/dashboard/epm/consultarEPM/117?desde=...&hasta=...
// pero sin pasar por HTTP: no hay usuario logueado, así que la sesión (BD de
// la empresa) se toma de Redis vía MercadosService.listar(), igual que
// alertas_cron.service.js. Las credenciales NO viven en el código.
import cron from "node-cron";
import Logger from "../helpers/logger.js";
import colors from "colors";
import MercadosService from "./mercados.service.js";
import { consultarEPM } from "./epm.service.js";

const mercadosService = MercadosService.getInstance();

// uuid de la empresa EPM en Redis (mercados*). Se puede sobrescribir por env.
const EPM_TENANT_UUID = process.env.EPM_CRON_TENANT_UUID || "18831d6929914c41be7ced65c485100e";
const EPM_CONSULTA = Number(process.env.EPM_CRON_CONSULTA || 117);
// Ventana a recargar: desde (hoy - DIAS_ATRAS) 00:00 hasta (ayer) 24:00.
// Con DIAS_ATRAS=2, el 02/10 trae 30/09 y 01/10 (se re-trae un día ya
// cargado por si la API de EPM completó datos tarde; la inserción es upsert).
const EPM_DIAS_ATRAS = Number(process.env.EPM_CRON_DIAS_ATRAS || 2);
const TZ = "America/Bogota";

let cronTask = null;

const fechaBogota = (offsetDias) => {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
  const base = new Date(`${hoy}T00:00:00Z`).getTime() + offsetDias * 86400000;
  return new Date(base).toISOString().slice(0, 10);
};

export function calcularRangoEpm(diasAtras = EPM_DIAS_ATRAS) {
  return {
    desde: `${fechaBogota(-diasAtras)} 00:00:00.000`,
    hasta: `${fechaBogota(-1)} 24:00:00.000`,
  };
}

export async function ejecutarCargaMedidasEpm() {
  const result = await mercadosService.listar();
  const mercado = result.success ? result.data?.find((m) => m?.uuid === EPM_TENANT_UUID) : null;
  const session = mercado?.accesos;
  if (!session?.basededatos) {
    Logger.warn(`[EPM_CRON] No se encontró el mercado ${EPM_TENANT_UUID} en Redis, se omite la carga.`);
    return { success: false };
  }

  const { desde, hasta } = calcularRangoEpm();
  Logger.info(`[EPM_CRON] Cargando medidas EPM consulta ${EPM_CONSULTA}: ${desde} → ${hasta}`);
  const res = await consultarEPM({ consulta: EPM_CONSULTA, desde, hasta, session });
  if (!res.success) {
    Logger.error(colors.red(`[EPM_CRON] Falló la carga de medidas EPM: ${res.message}`));
    return { success: false };
  }
  Logger.info(`[EPM_CRON] Carga completada: ${res.insertadas} medida(s) insertadas/actualizadas.`);
  return { success: true, insertadas: res.insertadas };
}

// Todos los días a la 1:00 a.m. (America/Bogota).
export function initEpmCron() {
  if (cronTask) return;
  cronTask = cron.schedule(
    "0 1 * * *",
    () => ejecutarCargaMedidasEpm().catch((err) => Logger.error(colors.red(`[EPM_CRON] Error: ${err.message}`))),
    { timezone: TZ },
  );
  Logger.info("[EPM_CRON] Tarea programada: 0 1 * * * (America/Bogota)");
}
