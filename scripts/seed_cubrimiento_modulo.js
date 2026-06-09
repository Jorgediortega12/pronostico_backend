import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

const LINK = "/cubrimiento";
const NOMBRE = "Cubrimiento";

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || "5433"),
  });

async function main() {
  const client = createClient();
  await client.connect();

  try {
    const check = await client.query(
      "SELECT cod FROM usu_menu WHERE link = $1",
      [LINK]
    );

    let codMenu;

    if (check.rows.length > 0) {
      codMenu = check.rows[0].cod;
      console.log(`El módulo '${LINK}' ya existe con cod=${codMenu}. Saltando inserción.`);
    } else {
      const maxOrden = await client.query(
        "SELECT COALESCE(MAX(orden), 0) AS max FROM usu_menu"
      );
      const orden = maxOrden.rows[0].max + 1;

      const result = await client.query(
        `INSERT INTO usu_menu (nombre, nivel, orden, codsuperior, link, imagen)
         VALUES ($1, $2, $3, NULL, $4, $5)
         RETURNING *`,
        [NOMBRE, 1, orden, LINK, null]
      );

      codMenu = result.rows[0].cod;
      console.log("Módulo creado exitosamente:");
      console.table(result.rows);
    }

    const perfiles = await client.query(
      "SELECT cod, nombre FROM usu_usuarioperfil ORDER BY nombre"
    );
    console.log("\nPerfiles disponibles:");
    console.table(perfiles.rows);

    for (const perfil of perfiles.rows) {
      const yaAsignado = await client.query(
        "SELECT 1 FROM usu_usuarioacceso WHERE codperfil = $1 AND codmenu = $2",
        [perfil.cod, codMenu]
      );

      if (yaAsignado.rows.length > 0) {
        console.log(
          `  → Perfil "${perfil.nombre}" (${perfil.cod}): ya tenía el módulo asignado.`
        );
      } else {
        await client.query(
          "INSERT INTO usu_usuarioacceso (codperfil, codmenu) VALUES ($1, $2)",
          [perfil.cod, codMenu]
        );
        console.log(
          `  ✓ Perfil "${perfil.nombre}" (${perfil.cod}): módulo asignado.`
        );
      }
    }
    
    console.log("\nVerificando/creando tablas del módulo de cubrimiento...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SphaerAI_contratos" (
        id             SERIAL PRIMARY KEY,
        nombre         VARCHAR(150),
        datos          TEXT,
        codigo_sic     VARCHAR(50),
        anio           INTEGER,
        fecha_creacion TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  ✓ SphaerAI_contratos");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SphaerAI_porcentaje_cubrimiento" (
        id             SERIAL PRIMARY KEY,
        anio           INTEGER,
        mes            INTEGER,
        valor          INTEGER,
        fecha_creacion TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  ✓ SphaerAI_porcentaje_cubrimiento");

    // ── 4. Índices ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sphaerai_contratos_nombre
        ON "SphaerAI_contratos" (nombre)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sphaerai_contratos_codigo_sic
        ON "SphaerAI_contratos" (codigo_sic)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sphaerai_contratos_anio
        ON "SphaerAI_contratos" (anio)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sphaerai_porc_cubrimiento_anio
        ON "SphaerAI_porcentaje_cubrimiento" (anio)
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
