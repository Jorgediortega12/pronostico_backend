import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import authService from '../services/auth.service.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contrasena son requeridos'
      });
    }

    const result = await authService.login(email, password);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Usuario no encontrado' || error.message === 'Contrasena incorrecta') {
      return res.status(401).json({
        success: false,
        message: 'Credenciales invalidas'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error al iniciar sesion',
      error: error.message
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y contrasena son requeridos'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contrasena debe tener al menos 6 caracteres'
      });
    }

    const result = await authService.register({ name, email, password });
    return res.status(201).json(result);
  } catch (error) {
    if (error.message === 'El email ya esta registrado') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = authService.getUserById(userId);

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
});

router.get('/verify', authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Token valido',
    user: req.user
  });
});

export default router;
