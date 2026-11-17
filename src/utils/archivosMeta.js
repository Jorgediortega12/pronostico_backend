// Fecha y usuario de cada archivo registrado en Descargas (tabla archivos).
// Cada vez que un reporte se (re)genera se inserta una fila nueva con creado_en / creado_por;
// el listado muestra la primera como "generación" y la última como "modificación".
//   - Las columnas se crean solas la primera vez (por empresa), sin tocar las filas viejas (quedan en NULL).
//   - creado_en es hora local de la app (se pasa explícito, no NOW() del servidor de BD).

const asegurados = new Set();

const claveCliente = (client) => `${client.host}:${client.port}:${client.database}`;

/** Crea creado_en / creado_por en archivos si faltan. `client` debe estar conectado. */
export async function asegurarColumnasArchivos(client) {
  const clave = claveCliente(client);
  if (asegurados.has(clave)) return;
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'archivos'
        AND column_name IN ('creado_en', 'creado_por')`,
  );
  const existentes = new Set(rows.map((r) => r.column_name));
  if (!existentes.has("creado_en")) await client.query("ALTER TABLE archivos ADD COLUMN creado_en TIMESTAMP");
  if (!existentes.has("creado_por")) await client.query("ALTER TABLE archivos ADD COLUMN creado_por VARCHAR(150)");
  asegurados.add(clave);
}

/** "Nombre Apellido" del usuario (usu_usuario.cod); null si no se encuentra. */
export async function nombreDeUsuario(client, userId) {
  if (userId == null) return null;
  const { rows } = await client.query(
    `SELECT trim(concat_ws(' ', pnombre, papellido)) AS nombre, usuario
       FROM usu_usuario WHERE cod = $1`,
    [userId],
  );
  if (!rows[0]) return null;
  return rows[0].nombre || rows[0].usuario || null;
}
