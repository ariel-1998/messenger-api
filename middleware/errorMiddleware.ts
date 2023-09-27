import { NextFunction, Response, Request } from "express";
import { ErrorModel } from "../models/ErrorModel";

export function RouteNotFound(req: Request, res: Response, next: NextFunction) {
  const error = `URL Not Found: ${req.originalUrl}`;
  console.log(error);
  res.status(404).json({ message: error });
}

export function errorHandler(
  error: ErrorModel,
  req: Request,
  res: Response,
  next: NextFunction
) {
  res
    .status(error.status || 500)
    .json({ message: error.message || "Server Error!" });
}
