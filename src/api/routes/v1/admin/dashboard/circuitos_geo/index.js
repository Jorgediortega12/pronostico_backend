import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import { uploadKmz } from "../../../../../../middleware/uploadKmz.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.post(
    "/cargar",
    uploadKmz.single("archivo"),
    validator(schema.cargar),
    controllers.cargar,
  );
  router.get("/departamentos", controllers.listarDepartamentos);
  router.get("/:departamento", controllers.obtener);

  return router;
}
