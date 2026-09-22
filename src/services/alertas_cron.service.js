// Cron multi-tenant del módulo de Alertas: a diferencia del cron único de
// cron.service.js (un solo job global, sin BD) o de clima_mapa_ingesta.js
// (sólo manual, atado a la sesión del usuario logueado), este job SÍ debe
// evaluar automáticamente a TODAS las empresas — recorre Redis vía
// MercadosService.listar() y se conecta a cada BD con createConectionPG,
// igual que resolveSessionByUcp.js. Un tenant que falle (sin tablas/creds
// inválidas) no aborta a los demás.
import cron from "node-cron";
import Logger from "../helpers/logger.js";
import colors from "colors";
import MercadosService from "./mercados.service.js";
import AlertasService from "./alertas.service.js";

const mercadosService = MercadosService.getInstance();
const alertasService = AlertasService.getInstance();

let cronTask = null;

export async function evaluarTodosLosTenants() {
  const result = await mercadosService.listar();
  if (!result.success || !result.data) {
    Logger.warn("[ALERTAS_CRON] No hay mercados/tenants registrados, se omite evaluación.");
    return { tenants_evaluados: 0, tenants_fallidos: 0 };
  }

  let evaluados = 0;
  let fallidos = 0;

  for (const mercado of result.data) {
    const session = mercado?.accesos;
    if (!session?.basededatos) continue;

    try {
      await alertasService.evaluarTenant(session);
      evaluados++;
    } catch (err) {
      fallidos++;
      Logger.error(
        colors.red(`[ALERTAS_CRON] Error evaluando tenant ${session.basededatos}: ${err.message}`),
      );
    }
  }

  Logger.info(`[ALERTAS_CRON] Evaluación multi-tenant completada: ${evaluados} ok, ${fallidos} fallidos`);
  return { tenants_evaluados: evaluados, tenants_fallidos: fallidos };
}

// Corre todos los días a las 05:30 (America/Bogota) — antes del cron general
// de sincronización (06:00) para que las alertas del día ya estén listas.
export function initAlertasCron() {
  if (cronTask) return;
  cronTask = cron.schedule("30 5 * * *", evaluarTodosLosTenants, {
    timezone: "America/Bogota",
  });
  Logger.info("[ALERTAS_CRON] Tarea programada: 30 5 * * * (America/Bogota)");
}
