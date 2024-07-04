const { CustomError } = require("./custom-error");

exports.RequestValidationError = class RequestValidationError extends CustomError {
  statusCode = 400;

  constructor(error) {
    super("Invalid request");

    this.error = error;
    // Only because we are extending a built in class
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serializeErrors() {
    const errors = {}
    this.error.issues.forEach(issue => {
      if(errors[issue.path[0]]) errors[issue.path[0]].push(issue.message)
      else errors[issue.path[0] || "non_field_errors"] = [issue.message]
    })
    return { 
      errors,
      message: `invalid request payload`,
      code: this.statusCode,
      status: false,
      resource: "Validation",
    };
  }
}