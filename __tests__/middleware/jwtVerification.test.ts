import { NextFunction, Response } from "express";
import {
  decodeToken,
  jwtVerification,
} from "../../src/middleware/jwtVerification";
import { CustomReq } from "../../src/models/CustomReq";
import { DynamicError } from "../../src/models/ErrorModel";
import { IUserModel, UserModel } from "../../src/models/UserModel";
import { createMockMiddlewareParams } from "../testUtils";
import jwt, { decode } from "jsonwebtoken";

const token = "someString";
const authorization = `Bearer ${token}`;
process.env.JWT_SECRET = "someSecret";
const mockDecodedUser = { _id: "someId" };
const mockUser = {
  _id: mockDecodedUser._id,
  name: "someName",
  email: "email@mail.com",
  password: "somePassword",
  image: "someString",
} as IUserModel;
jest.mock("jsonwebtoken");
jest.mock("../../src/models/UserModel");

describe("jwtVerification", () => {
  let request: CustomReq;
  let response: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    const { req, res, next } = createMockMiddlewareParams<CustomReq>();
    request = req;
    response = res;
    nextFn = next;
    req.headers.authorization = authorization;
    (decode as jest.Mock).mockReturnValue(mockDecodedUser);
    (UserModel.findById as jest.Mock).mockReturnValue(mockUser);
  });
  it("should call next with error when verify throws an error", () => {
    request.headers.authorization = undefined;
    const expectedErr = new DynamicError("You are not signed in!", 401);
    jwtVerification(request, response, nextFn);
    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(nextFn).toHaveBeenCalledWith(expectedErr);
  });
  it("should call next with error when verify throws an error", async () => {
    const expectedErr = new DynamicError("You are not signed in!", 401);
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      throw new Error();
    });
    await jwtVerification(request, response, nextFn);
    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(nextFn).toHaveBeenCalledWith(expectedErr);
  });
  it("should call next with error when findById throws an error", async () => {
    const expectedErr = new DynamicError("You are not signed in!", 401);
    (UserModel.findById as jest.Mock).mockRejectedValueOnce("someError");
    await jwtVerification(request, response, nextFn);
    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(nextFn).toHaveBeenCalledWith(expectedErr);
  });
  it("should call next with error when findById returns null", async () => {
    const expectedErr = new DynamicError("You are not signed in!", 401);
    (UserModel.findById as jest.Mock).mockResolvedValueOnce(null);
    await jwtVerification(request, response, nextFn);
    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(nextFn).toHaveBeenCalledWith(expectedErr);
  });
  it("should call next with NO error and add user to req.user when token is valid", async () => {
    await jwtVerification(request, response, nextFn);
    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(request.user).toStrictEqual(mockUser);
  });
  describe("decodeToken", () => {
    it("should return the decoded value and decode with right params", () => {
      (decode as jest.Mock).mockReturnValueOnce(mockUser);
      const returnedVal = decodeToken(token);
      expect(decode).toHaveBeenCalledWith(token);
      expect(returnedVal).toStrictEqual(mockUser);
    });
  });
});
