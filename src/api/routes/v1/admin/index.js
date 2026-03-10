import { Router } from "express";
import authMiddleware from "../../../middleware/auth.js";
import { decodeInfo } from "../../../../helpers/index.js";
import dashboardRoutes from "./dashboard/index.js";
import cpanelRoutes from "./cpanel/index.js";

const router = Router();

export default function () {
  const sessionDecrypt = (req, res, next) => {
    try {
      // ✅ Leer desde req.user (puesto por authMiddleware)
      const { dataEncrypt, timeStamp } = req.user;
      const data = decodeInfo(dataEncrypt, timeStamp);

      req.user.session = JSON.parse(data);
      next();
    } catch (error) {
      return res
        .status(401)
        .json({ success: false, message: "Sesión inválida o expirada" });
    }
  };

  router.use("/dashboard/", authMiddleware, sessionDecrypt, dashboardRoutes());
  router.use("/cpanel/", cpanelRoutes());
  return router;
}
