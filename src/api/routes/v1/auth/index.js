import express from "express";
import { decodeInfo } from "../../../../helpers/index.js";
import authMiddleware from "../../../../api/middleware/auth.js";
import authController from "./access/index.js";
import {
  loginSchema,
  loginSchemaS,
  registerSchema,
  agregarPerfilSchema,
  editarUsuarioSchema,
  changePasswordAuthSchema,
  validate,
} from "./access/schema.js";

const router = express.Router();

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

// Rutas públicas
router.post("/loginS", validate(loginSchemaS), authController.loginS);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh-token", authController.refreshToken);
router.put("/change-password", authController.changePassword);

// 🔐 Middleware para todas las rutas protegidas
router.use(authMiddleware, sessionDecrypt);

// Rutas protegidas
router.post("/register", validate(registerSchema), authController.register);
router.get("/profile", authController.getProfile);
router.get("/verify", authController.verifyToken);
router.put("/profile", authController.updateProfile);
router.put(
  "/change-password-auth",
  validate(changePasswordAuthSchema),
  authController.changePasswordAuth,
);
router.get("/users", authController.getAllUsers);
router.post(
  "/perfil",
  validate(agregarPerfilSchema),
  authController.agregarPerfile,
);
router.get("/perfiles", authController.getPerfiles);
router.put(
  "/users/:id",
  validate(editarUsuarioSchema),
  authController.editarUsuario,
);
router.delete("/users/:id", authController.eliminarUsuario);

export default router;
