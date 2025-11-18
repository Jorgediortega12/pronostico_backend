const AuthFailureError = (res, message = 'Authentication failed') => {
  return res.status(401).json({
    success: false,
    message
  });
};

const BadRequestError = (res, message = 'Bad request') => {
  return res.status(400).json({
    success: false,
    message
  });
};

const NotFoundError = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    message
  });
};

const InternalError = (res, message = 'Internal server error') => {
  return res.status(500).json({
    success: false,
    message
  });
};

const SuccessResponse = (res, data, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data
  });
};

module.exports = {
  AuthFailureError,
  BadRequestError,
  NotFoundError,
  InternalError,
  SuccessResponse
};
