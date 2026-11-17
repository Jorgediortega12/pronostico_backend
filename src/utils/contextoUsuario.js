// Usuario de la petición en curso, accesible sin pasarlo por cada servicio.
// El middleware de rutas /dashboard lo fija; helpers como insertFileRecord lo leen
// para saber quién generó o modificó un reporte.
import { AsyncLocalStorage } from "node:async_hooks";

const almacen = new AsyncLocalStorage();

/** Middleware Express: ejecuta el resto de la petición con el userId del token en el contexto. */
export const contextoUsuarioMiddleware = (req, _res, next) => {
  almacen.run({ userId: req.user?.userId ?? null }, next);
};

/** userId (usu_usuario.cod) de la petición actual, o null si no hay (cron, scripts). */
export const userIdActual = () => almacen.getStore()?.userId ?? null;
