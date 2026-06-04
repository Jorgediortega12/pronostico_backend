// middleware adaptado para params + query
export const validatorParamsQuery = (schema) => (req, res, next) => {
  const { error } = schema.validate(
    { ...req.params, ...req.query },
    { abortEarly: false },
  );
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join(", "),
    });
  }
  next();
};
