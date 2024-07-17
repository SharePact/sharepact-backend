const { CustomError } = require("./custom-error");

exports.NotFoundError = class NotFoundError extends CustomError {
  statusCode = 404;

  constructor(message) {
    super(message || "resource not found");

    this.message = message;
    // Only because we are extending a built in class
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  serializeErrors() {
    return {
      message: this.message,
      status: false,
      code: this.statusCode,
    };
  }
};
