import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

const LINK = "/demanda_pronostico";
const NOMBRE = "Demanda Pronóstico";

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
  });

async function main() {
  const client = createClient();
  await client.connect();

  try {
    // ── 1. Crear o recuperar el ítem de menú ────────────────────────────────
    const check = await client.query(
      "SELECT cod FROM usu_menu WHERE link = $1",
      [LINK],
    );

    let codMenu;

    if (check.rows.length > 0) {
      codMenu = check.rows[0].cod;
      console.log(
        `El módulo '${LINK}' ya existe con cod=${codMenu}. Saltando inserción.`,
      );
    } else {
      const maxOrden = await client.query(
        "SELECT COALESCE(MAX(orden), 0) AS max FROM usu_menu",
      );
      const orden = maxOrden.rows[0].max + 1;

      const result = await client.query(
        `INSERT INTO usu_menu (nombre, nivel, orden, codsuperior, link, imagen)
         VALUES ($1, $2, $3, NULL, $4, $5)
         RETURNING *`,
        [NOMBRE, 1, orden, LINK, null],
      );

      codMenu = result.rows[0].cod;
      console.log("Módulo creado exitosamente:");
      console.table(result.rows);
    }

    // ── 2. Asignar acceso a todos los perfiles existentes ───────────────────
    const perfiles = await client.query(
      "SELECT cod, nombre FROM usu_usuarioperfil ORDER BY nombre",
    );
    console.log("\nPerfiles disponibles:");
    console.table(perfiles.rows);

    for (const perfil of perfiles.rows) {
      const yaAsignado = await client.query(
        "SELECT 1 FROM usu_usuarioacceso WHERE codperfil = $1 AND codmenu = $2",
        [perfil.cod, codMenu],
      );

      if (yaAsignado.rows.length > 0) {
        console.log(
          `  → Perfil "${perfil.nombre}" (${perfil.cod}): ya tenía el módulo asignado.`,
        );
      } else {
        await client.query(
          "INSERT INTO usu_usuarioacceso (codperfil, codmenu) VALUES ($1, $2)",
          [perfil.cod, codMenu],
        );
        console.log(
          `  ✓ Perfil "${perfil.nombre}" (${perfil.cod}): módulo asignado.`,
        );
      }
    }

    // ── 3. Crear tablas del módulo si no existen ────────────────────────────
    console.log("\nVerificando/creando tablas del módulo de demanda...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SphaerAI_monthly_demand" (
        id           SERIAL PRIMARY KEY,
        year         INTEGER NOT NULL,
        month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        value        FLOAT   NOT NULL DEFAULT 0,
        percentage   FLOAT   NOT NULL DEFAULT 0,
        climate_type VARCHAR(10) NOT NULL DEFAULT 'NORMAL'
                     CHECK (climate_type IN ('NORMAL', 'NIÑO', 'NIÑA')),
        UNIQUE (year, month)
      )
    `);
    console.log("  ✓ SphaerAI_monthly_demand");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SphaerAI_yearly_demand" (
        id     SERIAL PRIMARY KEY,
        year   INTEGER NOT NULL UNIQUE,
        demand FLOAT   NOT NULL DEFAULT 0
      )
    `);
    console.log("  ✓ SphaerAI_yearly_demand");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SphaerAI_type_year" (
        id         SERIAL PRIMARY KEY,
        year       INTEGER     NOT NULL,
        type       VARCHAR(10) NOT NULL DEFAULT 'TIPICO'
                   CHECK (type IN ('TIPICO', 'ATIPICO')),
        user_id    INTEGER     NOT NULL,
        session_id INTEGER     NOT NULL,
        UNIQUE (year, user_id, session_id)
      )
    `);
    console.log("  ✓ SphaerAI_type_year");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SphaerAI_users_models" (
        id         SERIAL PRIMARY KEY,
        model_name VARCHAR(255) NOT NULL,
        user_id    INTEGER      NOT NULL,
        session_id INTEGER      NOT NULL,
        start_date DATE         NOT NULL,
        end_date   DATE         NOT NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);
    console.log("  ✓ SphaerAI_users_models");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SphaerAI_users_models_values" (
        id           SERIAL PRIMARY KEY,
        model_id     INTEGER     NOT NULL REFERENCES "SphaerAI_users_models"(id) ON DELETE CASCADE,
        date         DATE        NOT NULL,
        value        FLOAT       NOT NULL DEFAULT 0,
        climate_type VARCHAR(10) NOT NULL DEFAULT 'NORMAL'
                     CHECK (climate_type IN ('NORMAL', 'NIÑO', 'NIÑA')),
        UNIQUE (model_id, date)
      )
    `);
    console.log("  ✓ SphaerAI_users_models_values");

    // ── 4. Índices ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sphaer_monthly_demand_year
        ON "SphaerAI_monthly_demand" (year)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sphaer_type_year_user_session
        ON "SphaerAI_type_year" (user_id, session_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sphaer_users_models_user_session
        ON "SphaerAI_users_models" (user_id, session_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sphaer_users_models_values_model
        ON "SphaerAI_users_models_values" (model_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sphaer_users_models_values_date
        ON "SphaerAI_users_models_values" (model_id, date)
    `);
    console.log("  ✓ Índices creados/verificados");

    console.log("\n✅ Seed completado exitosamente.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error al ejecutar seed:", err.message);
  process.exit(1);
});
