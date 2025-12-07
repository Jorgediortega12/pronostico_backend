import express from "express";
import authMiddleware from "../../../../middleware/auth.middleware.js";
import authController from "./access/index.js";
import { loginSchema, registerSchema, validate } from "./access/schema.js";

const router = express.Router();

// Rutas públicas (sin autenticación)
router.post("/login", validate(loginSchema), authController.login);
router.post("/register", validate(registerSchema), authController.register);
router.post("/refresh-token", authController.refreshToken);

// Rutas protegidas (requieren autenticación)
router.get("/profile", authMiddleware, authController.getProfile);
router.get("/verify", authMiddleware, authController.verifyToken);
router.put("/profile", authMiddleware, authController.updateProfile);
router.put("/change-password", authMiddleware, authController.changePassword);

export default router;
