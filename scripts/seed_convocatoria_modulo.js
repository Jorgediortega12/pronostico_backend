import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_FILE = path.join(__dirname, "..", "init", "convocatoria.sql");

const LINK = "/convocatoria";
const NOMBRE = "Gestión contratos";

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
      // Mantener el nombre actualizado aunque el módulo ya exista.
      await client.query("UPDATE usu_menu SET nombre = $1 WHERE cod = $2", [
        NOMBRE,
        codMenu,
      ]);
      console.log(
        `El módulo '${LINK}' ya existe con cod=${codMenu}. Nombre actualizado a "${NOMBRE}".`,
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

    // ── 3. Crear las tablas del módulo (init/convocatoria.sql) ──────────────
    console.log("\nVerificando/creando tablas del módulo de convocatoria...");
    const sql = readFileSync(SQL_FILE, "utf8");
    await client.query(sql);
    console.log("  ✓ Tablas de convocatoria creadas/verificadas");

    console.log("\n✅ Seed completado exitosamente.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error al ejecutar seed:", err.message);
  process.exit(1);
});
