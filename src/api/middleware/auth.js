import jwt from "jsonwebtoken";
import { secretKey } from "../../config/index.js";
import Logger from "../../helpers/logger.js";

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No se proporcionó token de autenticación",
      });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Formato de token inválido. Use: Bearer TOKEN",
      });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, secretKey);

    // ✅ FIX: usar req.user en lugar de req.body.session
    // req.body puede ser undefined en peticiones GET
    req.user = decoded; // { dataEncrypt, timeStamp, ...payload }
    next();
  } catch (error) {
    const msg = String(error);

    if (msg.includes("jwt expired")) {
      return res
        .status(401)
        .json({ success: false, message: "Token expirado", expired: true });
    }
    if (
      msg.includes("invalid token") ||
      msg.includes("jwt malformed") ||
      msg.includes("invalid signature") ||
      msg.includes("JsonWebTokenError")
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Token no válido" });
    }

    Logger.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Error de autenticación" });
  }
};

export default authMiddleware;
