import express from "express";
import authMiddleware from "../../../../middleware/auth.middleware.js";
import menuController from "./access/index.js";
import {
  asignarModuloSchema,
  editarPerfilSchema,
  validate
} from "./access/schema.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);
// Obtener módulos padres (rutas principales)
router.get("/modulos", menuController.obtenerModulosPadres);
// Obtener perfiles disponibles
router.get("/perfiles", menuController.obtenerPerfilesDisponibles);
// Editar perfil
router.put("/perfiles/:id", validate(editarPerfilSchema), menuController.editarPerfil);
// Eliminar perfil
router.delete("/perfiles/:id", menuController.eliminarPerfil);
// Obtener módulos asignados a un perfil específico
router.get("/perfil/:codperfil", menuController.obtenerModulosPorPerfil);
// Asignar módulo a un perfil
router.post("/asignar", validate(asignarModuloSchema), menuController.asignarModuloAPerfil);
// Remover módulo de un perfil
router.post("/remover", validate(asignarModuloSchema), menuController.removerModuloDePerfil);

export default router;
