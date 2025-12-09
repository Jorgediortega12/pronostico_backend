import express from "express";
import authMiddleware from "../../../../middleware/auth.middleware.js";
import authController from "./access/index.js";
import { loginSchema, registerSchema, agregarPerfilSchema, editarUsuarioSchema, validate } from "./access/schema.js";

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
router.get("/users", authMiddleware, authController.getAllUsers);
router.post("/perfil", authMiddleware, validate(agregarPerfilSchema), authController.agregarPerfile);
router.get("/perfiles", authMiddleware, authController.getPerfiles);
    
// Rutas para editar y eliminar usuarios
router.put("/users/:id", authMiddleware, validate(editarUsuarioSchema), authController.editarUsuario);
router.delete("/users/:id", authMiddleware, authController.eliminarUsuario);

export default router;