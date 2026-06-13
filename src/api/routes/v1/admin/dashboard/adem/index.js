import { Router } from "express";
import { uploadZip } from "../../../../../../middleware/uploadZip.js";
import * as controller from "./access/index.js";

const router = Router();

export default function () {
  router.post("/cargar", uploadZip.single("file"), controller.cargarAdemZip);
  return router;
}