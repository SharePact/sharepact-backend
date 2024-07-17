const BuildHttpResponse = (
  res,
  code,
  message,
  data = null,
  pagination = null
) => {
  if (code === 500) {
    console.log("internal server error", { message, data });
    message = "internal server error";
  }

  let responseObject = { code, message, data, pagination };
  if (!pagination) {
    responseObject = { code, message, data };
  }

  return res.status(code).json(responseObject);
};

module.exports = {
  BuildHttpResponse,
};
