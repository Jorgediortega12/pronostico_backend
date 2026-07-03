import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.post("/registrar", validator(schema.registrar), controllers.registrar);
  router.get("/listar", controllers.listar);
  return router;
}
