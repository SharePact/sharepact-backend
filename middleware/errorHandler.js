const axios = require("axios");
require("dotenv").config();

const { CustomError } = require("../errors/custom-error");

exports.errorHandler = (err, req, res, next) => {
  if (axios.isAxiosError(err)) {
    return res.status(err.response?.status || 500).send({
      status: false,
      message: err.response?.data.message || "Something went wrong",
      code: err.response?.status,
    });
  }

  if (err instanceof CustomError) {
    return res.status(err.statusCode).send(err.serializeErrors());
  }

  return res.status(500).send({
    status: false,
    message:
      process.env.NODE_ENV !== "production"
        ? err.message || "Something went wrong"
        : "Something went wrong, please try again later.",
    code: 500,
  });
};
