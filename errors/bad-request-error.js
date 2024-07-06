const { CustomError } = require("./custom-error");

exports.BadRequestError = class BadRequestError extends CustomError {
  statusCode = 400;

  constructor(message) {
    super(message || "bad request");

    this.message = message;
    // Only because we are extending a built in class
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }

  serializeErrors() {
    return {
        message: this.message,
        status: false,
        code: this.statusCode,
    };
  }
}