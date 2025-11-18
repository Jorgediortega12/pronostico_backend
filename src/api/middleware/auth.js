const jwt = require('jsonwebtoken');
const { secretKey } = require('../../config');
const { AuthFailureError } = require('../../helpers/api.response');
const Logger = require('../../helpers/logger');

const auth = async (req, res, next) => {
  const authHeader = req.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return AuthFailureError(res, 'Authorization header missing or invalid');
  }

  const [, token] = authHeader.split(' ');

  try {
    const payload = jwt.verify(token, secretKey);
    req.body.session = payload;

    next();
  } catch (error) {
    if (String(error).includes('invalid token')) {
      return AuthFailureError(res, 'Token is not valid');
    }

    // Para la renovacion de token, identificamos cuando expira
    if (String(error).includes('jwt expired')) {
      return res.status(401).json({
        success: false,
        message: 'Token is expired',
        expired: true // Flag para que el cliente renueve el token
      });
    }

    Logger.error(error);
    return AuthFailureError(res);
  }
};

module.exports = auth;
