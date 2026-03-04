import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as Mercados from "./access/index.js";
// import { upload } from "../../../../../middleware/upload.js";
const router = Router();

export default function () {
  router.get("/listar", Mercados.listar);
  router.post("/crear", validator(schema.crear), Mercados.crear);
  router.post("/editar", validator(schema.editar), Mercados.editar);
  router.post("/buscar", validator(schema.buscar), Mercados.buscar);
  router.post("/listarM", validator(schema.listarM), Mercados.listarM);
  router.post("/accesosBD", validator(schema.accesosBD), Mercados.accesosBD);
  return router;
}
