import { Router } from "express";
import validator, {
  ValidationSource,
} from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.get(
    "/noticias",
    validator(schema.listarNoticias, ValidationSource.QUERY),
    controllers.listarNoticias,
  );

  return router;
}
