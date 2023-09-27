import { Error } from "mongoose";
export class ErrorModel {
  status: number;
  message: string | string[];
}

export class DynamicError extends ErrorModel {
  constructor(message: string, status = 400) {
    super();
    this.status = status;
    this.message = message;
  }
}

export class MongoErrorModel extends ErrorModel {
  constructor(errors: Error.ValidationError, status = 400) {
    super();
    this.status = status;
    this.message = Object.keys(errors.errors)
      .filter((key) => errors.errors?.[key]?.name === "ValidatorError")
      .map((key) => {
        return errors.errors?.[key]?.message;
      });
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
