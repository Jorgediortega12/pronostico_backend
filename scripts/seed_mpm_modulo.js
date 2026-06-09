import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

const LINK = "/mpm";
const NOMBRE = "MPM";

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
    // ── 1. Crear o recuperar el ítem de menú ────────────────────────────────
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

    // ── 2. Asignar acceso a todos los perfiles existentes ───────────────────
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

    // MPM no crea tablas propias: consume el servicio ML (FastAPI) vía proxy.
    console.log("\n✅ Seed completado exitosamente.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error al ejecutar seed:", err.message);
  process.exit(1);
});
