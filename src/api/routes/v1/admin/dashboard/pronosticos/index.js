// routes/pronosticos.routes.js
import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.post(
    "/exportarBulk",
    validator(schema.exportarBulk),
    controllers.exportarBulk
  );
  router.post("/borrarPronosticos", controllers.borrarPronosticos); // puedes añadir schema si quieres
  router.post("/play", validator(schema.play), controllers.play);
  // POST /retrainModel?ucp=Atlantico
  router.post(
    "/retrainModel",
    validator(schema.retrainModel),
    controllers.retrainModel
  );
  return router;
}
