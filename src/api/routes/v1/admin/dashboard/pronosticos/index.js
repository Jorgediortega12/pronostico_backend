// routes/pronosticos.routes.js
import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.post(
    "/crearPronostico",
    validator(schema.crearPronostico),
    controllers.crearPronostico
  );
  router.post(
    "/crearPronosticosBulk",
    validator(schema.crearPronosticosBulk),
    controllers.crearPronosticosBulk
  );
  router.post("/borrarPronosticos", controllers.borrarPronosticos); // puedes añadir schema si quieres
  return router;
}
