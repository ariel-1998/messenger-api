import { NextFunction, Request, Response } from "express";
import { Error } from "mongoose";

export function createMockMiddlewareParams<T = Request>() {
  const req = {
    originalUrl: "someUrl",
    headers: {},
    query: {},
    params: {},
    body: {},
  } as T;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    sendStatus: jest.fn(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

export function generateValidationError(
  key: string,
  message: string
): Error.ValidationError {
  const errors = {
    errors: {},
  };
  errors.errors[key] = { name: "ValidatorError", message };
  return errors as unknown as Error.ValidationError;
}
