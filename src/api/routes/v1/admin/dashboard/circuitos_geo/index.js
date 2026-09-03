import { Router } from "express";
import validator, {
  ValidationSource,
} from "../../../../../middleware/validator.js";
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
  router.get(
    "/buscar",
    validator(schema.buscar, ValidationSource.QUERY),
    controllers.buscar,
  );
  router.get(
    "/relacionados",
    validator(schema.relacionados, ValidationSource.QUERY),
    controllers.relacionados,
  );
  // Catch-all de departamento: debe ir de último para no interceptar las
  // rutas de arriba (/departamentos, /buscar, /relacionados).
  router.get("/:departamento", controllers.obtener);

  return router;
}
