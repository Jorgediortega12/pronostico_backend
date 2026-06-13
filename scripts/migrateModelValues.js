/**
 * Migra los valores de un modelo desde GMR_users_models_values (DB GMR)
 * hacia SphaerAI_users_models_values (DB local).
 *
 * Uso: node scripts/migrateModelValues.js <model_id>
 * Ejemplo: node scripts/migrateModelValues.js 262
 */

import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

const MODEL_ID = parseInt(process.argv[2]);
if (!MODEL_ID || isNaN(MODEL_ID)) {
  console.error(
    "❌ Debes pasar el model_id como argumento. Ej: node scripts/migrateModelValues.js 262",
  );
  process.exit(1);
}

const gmrPool = new Pool({
  host: process.env.GMR_POSTGRES_HOST,
  port: parseInt(process.env.GMR_POSTGRES_PORT || "5435"),
  database: process.env.GMR_POSTGRES_DATABASE,
  user: process.env.GMR_POSTGRES_USER,
  password: process.env.GMR_POSTGRES_PASSWORD,
});

const localPool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

async function migrate() {
  let gmrClient, localClient;
  try {
    gmrClient = await gmrPool.connect();
    localClient = await localPool.connect();

    // 1. Leer valores desde GMR
    console.log(
      `\n📦 Leyendo valores del modelo ${MODEL_ID} desde GMR (${process.env.GMR_POSTGRES_HOST})...`,
    );
    const { rows: gmrRows } = await gmrClient.query(
      `SELECT model_id, date, value, climate_type
       FROM "GMR_users_models_values"
       WHERE model_id = $1
       ORDER BY date`,
      [MODEL_ID],
    );

    if (!gmrRows.length) {
      console.log(
        `⚠️  No se encontraron valores para model_id=${MODEL_ID} en GMR.`,
      );
      return;
    }
    console.log(`✅ ${gmrRows.length} filas encontradas en GMR.`);

    // 2. Insertar en DB local dentro de una transacción
    console.log(
      `\n🔄 Insertando en SphaerAI_users_models_values (DB local)...`,
    );
    await localClient.query("BEGIN");

    // Limpiar valores previos del modelo en local para evitar duplicados
    const { rowCount: deleted } = await localClient.query(
      `DELETE FROM "SphaerAI_users_models_values" WHERE model_id = $1`,
      [MODEL_ID],
    );
    if (deleted > 0) {
      console.log(
        `🗑️  Se eliminaron ${deleted} filas previas del modelo ${MODEL_ID} en local.`,
      );
    }

    for (const row of gmrRows) {
      await localClient.query(
        `INSERT INTO "SphaerAI_users_models_values" (model_id, date, value, climate_type)
         VALUES ($1, $2, $3, $4)`,
        [row.model_id, row.date, row.value, row.climate_type],
      );
    }

    await localClient.query("COMMIT");
    console.log(
      `✅ Migración completada: ${gmrRows.length} filas insertadas para model_id=${MODEL_ID}.`,
    );

    // 3. Verificar
    const { rows: verify } = await localClient.query(
      `SELECT COUNT(*) AS total FROM "SphaerAI_users_models_values" WHERE model_id = $1`,
      [MODEL_ID],
    );
    console.log(
      `🔍 Verificación: ${verify[0].total} filas en DB local para model_id=${MODEL_ID}.`,
    );
  } catch (err) {
    if (localClient) await localClient.query("ROLLBACK").catch(() => {});
    console.error("❌ Error durante la migración:", err.message);
    process.exit(1);
  } finally {
    if (gmrClient) gmrClient.release();
    if (localClient) localClient.release();
    await gmrPool.end();
    await localPool.end();
  }
}

migrate();
