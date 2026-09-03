import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.get("/catalogo", controllers.listarCatalogo);
  router.put(
    "/catalogo/:origen/:id",
    validator(schema.actualizar),
    controllers.actualizar,
  );
  return router;
}
