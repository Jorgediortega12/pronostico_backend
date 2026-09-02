import { Router } from "express";
import validator, {
  ValidationSource,
} from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.get("/", controllers.listar);
  router.post("/", validator(schema.guardar), controllers.guardar);
  router.delete("/:ucp", controllers.eliminar);
  router.get(
    "/buscar/openweather",
    validator(schema.buscar, ValidationSource.QUERY),
    controllers.buscarOpenweather,
  );
  router.get(
    "/buscar/accuweather",
    validator(schema.buscar, ValidationSource.QUERY),
    controllers.buscarAccuweather,
  );
  router.get("/existentes", controllers.listarCiudadesYaConfiguradas);
  // Administración del catálogo suelto — pensado para superadmin
  // (Configuración > superadmin), no para el admin de cada empresa.
  router.get("/catalogo", controllers.listarCatalogoCompleto);
  router.put(
    "/catalogo/:id",
    validator(schema.actualizarCatalogo),
    controllers.actualizarCatalogoCiudad,
  );

  return router;
}
