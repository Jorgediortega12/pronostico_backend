import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as Usuarios from "./access/index.js";
const router = Router();

export default function () {
  router.get("/listar", Usuarios.listar);
  router.post("/crear", validator(schema.crear), Usuarios.crear);
  router.post("/editar", validator(schema.editar), Usuarios.editar);
  router.post("/estado", validator(schema.estado), Usuarios.estado);
  return router;
}
