// Oculta credenciales antes de devolver al cliente (o escribir en logs) mensajes que vienen de servicios
// internos. Un error de validación de FastAPI, por ejemplo, devuelve el cuerpo enviado ("input"), que
// incluye `database_url` con usuario y contraseña de la base de datos.

const MASK = "***";

export const redactSecrets = (value) => {
  if (value === null || value === undefined) return value;
  const text = typeof value === "string" ? value : String(value);
  return (
    text
      // "database_url": "postgresql://usuario:clave@host/db"  ->  "database_url": "***"
      .replace(/("?database_url"?\s*[:=]\s*)"[^"]*"/gi, `$1"${MASK}"`)
      // database_url=postgresql://usuario:clave@host/db (query string)  ->  database_url=***
      .replace(/(database_url=)[^\s&"']+/gi, `$1${MASK}`)
      // cualquier URL con credenciales:  esquema://usuario:clave@  ->  esquema://***@
      .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s"'\\/@]+(?::[^\s"'\\@]*)?@/gi, `$1${MASK}@`)
  );
};

export default redactSecrets;
