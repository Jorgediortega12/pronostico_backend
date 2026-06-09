import cron from "node-cron";
import redisModel from "../models/redis.model.js";
import Logger from "../helpers/logger.js";

const REDIS_KEY = "cron:config";

const DEFAULT_CONFIG = {
  id: 1,
  hour: 6,
  minute: 0,
  is_active: true,
  last_execution: null,
  last_status: "pending",
  last_error_message: null,
  schedule_time: "06:00",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let cronTask = null;
const redis = redisModel.getInstance();

async function getConfig() {
  try {
    const raw = await redis.get(REDIS_KEY);
    return raw ? JSON.parse(raw) : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function saveConfig(config) {
  await redis.set(REDIS_KEY, config);
}

async function runSync() {
  const config = await getConfig();
  Logger.info(`[CRON] Ejecutando sincronización programada...`);
  try {
    const updatedConfig = {
      ...config,
      last_execution: new Date().toISOString(),
      last_status: "success",
      last_error_message: null,
      updated_at: new Date().toISOString(),
    };
    await saveConfig(updatedConfig);
    Logger.info(`[CRON] Sincronización completada.`);
  } catch (err) {
    const updatedConfig = {
      ...config,
      last_execution: new Date().toISOString(),
      last_status: "error",
      last_error_message: err.message,
      updated_at: new Date().toISOString(),
    };
    await saveConfig(updatedConfig);
    Logger.error(`[CRON] Error en sincronización: ${err.message}`);
  }
}

function scheduleTask(hour, minute) {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
  const expression = `${minute} ${hour} * * *`;
  cronTask = cron.schedule(expression, runSync, { timezone: "America/Bogota" });
  Logger.info(`[CRON] Tarea programada: ${expression}`);
}

export async function initCron() {
  const config = await getConfig();
  if (config.is_active) {
    scheduleTask(config.hour, config.minute);
  }
}

export async function getCronConfig() {
  return await getConfig();
}

export async function setCronConfig({ hour, minute }) {
  const config = await getConfig();
  const updated = {
    ...config,
    hour,
    minute,
    schedule_time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    updated_at: new Date().toISOString(),
  };
  await saveConfig(updated);
  scheduleTask(hour, minute);
  return updated;
}

export async function manualSync() {
  await runSync();
  return await getConfig();
}