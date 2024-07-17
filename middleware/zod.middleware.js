const {
  RequestValidationError,
} = require("../errors/request-validation-error.js");

exports.ZodMiddleware = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync(req.body);
    return next();
  } catch (error) {
    const validationError = new RequestValidationError(error).serializeErrors();
    res.status(validationError.code).json({ ...validationError });
  }
};
