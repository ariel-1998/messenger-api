import { NextFunction, Response, Request } from "express";
import { ErrorModel } from "../models/ErrorModel.js";

export function RouteNotFound(req: Request, res: Response, next: NextFunction) {
  const error = `URL Not Found: ${req.originalUrl}`;
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
