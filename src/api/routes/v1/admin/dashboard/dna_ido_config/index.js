import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // Empresas (creadas una única vez, reutilizadas por mc/municipios)
  router.post(
    "/empresas/crear",
    validator(schema.crearEmpresa),
    controllers.crearEmpresa,
  );
  router.get("/empresas/obtener", controllers.obtenerEmpresas);
  router.post(
    "/empresas/eliminar",
    validator(schema.eliminarEmpresa),
    controllers.eliminarEmpresa,
  );

  // Config (mc + empresa + municipios)
  router.post("/crear", validator(schema.crear), controllers.crear);
  router.get("/obtener", controllers.obtenerTodos);
  router.post(
    "/obtenerPorMC",
    validator(schema.obtenerPorMC),
    controllers.obtenerPorMC,
  );
  router.post(
    "/actualizar",
    validator(schema.actualizar),
    controllers.actualizar,
  );
  router.post("/eliminar", validator(schema.eliminar), controllers.eliminar);
  return router;
}
