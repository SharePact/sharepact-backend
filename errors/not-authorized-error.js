const { CustomError } = require("./custom-error");

exports.NotAuthorizedError = class NotAuthorizedError extends CustomError {
    statusCode = 401;
  
    constructor(message = "Not Authorized") {
      super(message);
  
      Object.setPrototypeOf(this, NotAuthorizedError.prototype);
    }
  
    serializeErrors() {
      return { message: this.message, code: this.statusCode, status: false };
    }
  }