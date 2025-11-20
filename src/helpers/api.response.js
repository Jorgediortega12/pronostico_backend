export const AuthFailureError = (res, message = "Authentication failed") => {
  return res.status(401).json({
    success: false,
    message,
  });
};

export const BadRequestError = (res, message = "Bad request") => {
  return res.status(400).json({
    success: false,
    message,
  });
};

export const NotFoundError = (res, message = "Resource not found") => {
  return res.status(404).json({
    success: false,
    message,
  });
};

export const InternalError = (res, message = "Internal server error") => {
  return res.status(500).json({
    success: false,
    message,
  });
};

export const SuccessResponse = (res, data, message = "Success") => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

export const responseError = (code, type, statusCode, res) => {
  return res.status(statusCode).json({
    statusCode: code,
    message: type,
    success: false,
  });
};
