exports.CustomError = class CustomError extends Error {
    statusCode = 500;
  
    constructor(message) {
      super(message);
  
      Object.setPrototypeOf(this, CustomError.prototype);
    }
}