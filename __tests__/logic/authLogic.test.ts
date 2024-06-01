import { NextFunction, Response, Request } from "express";
import { IUserModel, UserModel, userSchema } from "../../src/models/UserModel";
import {
  createMockMiddlewareParams,
  generateValidationError,
} from "../testUtils";
import { loginUser, registerUser } from "../../src/logic/authLogic";
import { DynamicError, MongoErrorModel } from "../../src/models/ErrorModel";
import { Error } from "mongoose";
import { CredentialsModel } from "../../src/models/CredentialsModel";

jest.mock("../../src/models/UserModel");
process.env.JWT_SECRET = "someSecret";
const user = {
  name: "user",
  email: "email@gmail.com",
  password: "somePassword",
  image: "someUrl",
} as Omit<IUserModel, "_id">;
describe("authLogic", () => {
  let request: Request;
  let response: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    const { req, next, res } = createMockMiddlewareParams();
    request = req;
    response = res;
    nextFn = next;
  });

  describe("registerUser", () => {
    beforeEach(() => {
      request.body.email = user.email;
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
    });
    it("should call next with error when UserModel.findOne throws an error", async () => {
      (UserModel.findOne as jest.Mock).mockRejectedValueOnce("someError");
      const expectedErr = new DynamicError("Server Error.", 500);
      await registerUser(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when UserModel.findOne return a user", async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(user);
      const expectedErr = new DynamicError("User already exist", 409);
      await registerUser(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when validateSync fails", async () => {
      (UserModel as unknown as jest.Mock).mockImplementationOnce(() => {
        return {
          findOne: jest.fn().mockResolvedValueOnce(null),
          validateSync: jest.fn().mockReturnValueOnce(error),
        };
      });
      const error = generateValidationError("email", "Email is required");
      const expectedErr = { message: ["Email is required"], status: 400 };
      await registerUser(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when save rejected with an error", async () => {
      (UserModel as unknown as jest.Mock).mockImplementationOnce(() => {
        return {
          findOne: jest.fn().mockResolvedValueOnce(null),
          validateSync: jest.fn().mockReturnValueOnce(null),
          save: jest.fn().mockRejectedValueOnce("someError"),
        };
      });
      const expectedErr = new DynamicError("Server Error.", 500);
      await registerUser(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when  save returns null", async () => {
      (UserModel as unknown as jest.Mock).mockImplementationOnce(() => {
        return {
          findOne: jest.fn().mockResolvedValueOnce(null),
          validateSync: jest.fn().mockReturnValueOnce(null),
          save: jest.fn().mockResolvedValueOnce(null),
        };
      });
      const expectedErr = new DynamicError(
        "Server error, try again later",
        500
      );
      await registerUser(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should create jwt send it in response", async () => {
      (UserModel as unknown as jest.Mock).mockImplementationOnce(() => {
        return {
          findOne: jest.fn().mockResolvedValueOnce(null),
          validateSync: jest.fn().mockReturnValueOnce(null),
          save: jest.fn().mockResolvedValueOnce(user),
        };
      });
      await registerUser(request, response, nextFn);
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith(expect.any(String));
    });
  });
  describe("loginUser", () => {
    const body = { email: "someEmail@mail.com", password: user.password };
    beforeEach(() => {
      request.body = { ...body };
      (UserModel.findOne as jest.Mock).mockImplementation(() => {
        const passwordCompare = jest
          .fn()
          .mockImplementation((password: string) =>
            Promise.resolve(password === user.password)
          );
        return Promise.resolve({ ...user, passwordCompare });
      });
    });
    it("should call next with error when email is nullish", () => {
      request.body.email = "";
      const expectedErr = new DynamicError(
        "Email or password were not provided",
        400
      );
      loginUser(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when password is nullish", () => {
      request.body.password = "";
      const expectedErr = new DynamicError(
        "Email or password were not provided",
        400
      );
      loginUser(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when findOne throws an error", async () => {
      const expectedErr = new DynamicError("Server Error.", 500);
      (UserModel.findOne as jest.Mock).mockRejectedValueOnce("someError");
      await loginUser(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when findOne returns null", async () => {
      const expectedErr = new DynamicError(
        "Email or password are incorrect",
        401
      );
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(null);
      await loginUser(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when passwordCompare returns false", async () => {
      request.body.password = "anotherPassword";
      const expectedErr = new DynamicError(
        "Email or password are incorrect",
        401
      );
      await loginUser(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should respond with jwt when authorized", async () => {
      await loginUser(request, response, nextFn);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
