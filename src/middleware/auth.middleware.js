import authService from '../services/auth.service.js';

const authMiddleware = (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    // El formato esperado es: "Bearer TOKEN"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido. Use: Bearer TOKEN'
      });
    }

    const token = parts[1];

    // Verificar token
    const decoded = authService.verifyToken(token);

    // Adjuntar usuario al request
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalido o expirado',
      error: error.message
    });
  }
};

export default authMiddleware;
