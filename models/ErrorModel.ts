import { Error } from "mongoose";
export class ErrorModel {
  status: number;
  message: string | string[];
}

export class DynamicErrorModel extends ErrorModel {
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
    this.message = Object.keys(errors.errors).map((error) => {
      return errors.errors[error].message;
    });
  }
}
