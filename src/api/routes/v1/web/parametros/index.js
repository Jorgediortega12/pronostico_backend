import { Router } from "express";
import validator from "../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as Mercados from "./access/index.js";
const router = Router();

export default function () {
  router.post("/listarM", validator(schema.listarM), Mercados.listarM);
  return router;
}
