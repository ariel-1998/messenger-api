import { Error } from "mongoose";
export class ErrorModel {
  constructor(public message: string | string[], public status: number) {
    this.message = message;
    this.status = status;
  }
}

export class DynamicError extends ErrorModel {
  constructor(message: string, status = 400) {
    super(message, status);
  }
}

export class MongoErrorModel extends ErrorModel {
  constructor(errors: Error.ValidationError, status = 400) {
    const errorsArr = Object.keys(errors.errors)
      .filter((key) => errors.errors?.[key]?.name === "ValidatorError")
      .map((key) => {
        return errors.errors?.[key]?.message;
      });
    const message = errorsArr.length ? errorsArr : "Invalid data was sent!";
    super(message, status);
  }
}

export class DBErrorHandler {
  static handle(error: any) {
    if (error.name === "ValidationError") {
      return new MongoErrorModel(error);
    }
    return new DynamicError("An unknown error occurred!", 500);
  }
}
