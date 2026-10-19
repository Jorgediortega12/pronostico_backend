import { Router } from "express";

import menuController from "./access/index.js";
import * as areas from "./access/areas.js";
import {
  asignarModuloSchema,
  editarPerfilSchema,
  crearModulo,
  validate,
} from "./access/schema.js";

const router = Router();

export default function () {
  // Obtener módulos padres (rutas principales)
  router.get("/modulos", menuController.obtenerModulosPadres);
  // Obtener perfiles disponibles
  router.get("/perfiles", menuController.obtenerPerfilesDisponibles);
  // Editar perfil
  router.put(
    "/perfiles/:id",
    validate(editarPerfilSchema),
    menuController.editarPerfil,
  );
  // Eliminar perfil
  router.delete("/perfiles/:id", menuController.eliminarPerfil);
  // Obtener módulos asignados a un perfil específico
  router.get("/perfil/:codperfil", menuController.obtenerModulosPorPerfil);
  // Asignar módulo a un perfil
  router.post(
    "/asignar",
    validate(asignarModuloSchema),
    menuController.asignarModuloAPerfil,
  );
  // Remover módulo de un perfil
  router.post(
    "/remover",
    validate(asignarModuloSchema),
    menuController.removerModuloDePerfil,
  );
  // Crear módulo
  router.post("/modulos", validate(crearModulo), menuController.crearModulo);
  //actualizar orden de modulo
  router.put("/modulos/:cod/orden", menuController.actualizarOrdenModulo);
  //eliminar modulo
  router.delete("/modulos/:cod", menuController.eliminarModulo);

  // ── Áreas del menú y accesos frecuentes (agrupación de módulos) ──
  const { validar, areaSchema, areaUpdateSchema, moduloAreaSchema, frecuentesSchema, copiarSchema } = areas.validaciones;
  router.get("/estructura/:codperfil", areas.estructura);
  router.get("/areas/configuracion/:codperfil", areas.configuracion);
  router.post("/areas/copiar", validar(copiarSchema), areas.copiarConfiguracion);
  router.post("/areas", validar(areaSchema), areas.crearArea);
  router.put("/areas/:cod", validar(areaUpdateSchema), areas.actualizarArea);
  router.delete("/areas/:cod", areas.eliminarArea);
  router.put("/modulos/:cod/area", validar(moduloAreaSchema), areas.asignarModuloAArea);
  router.put("/frecuentes", validar(frecuentesSchema), areas.guardarFrecuentes);

  return router;
}
