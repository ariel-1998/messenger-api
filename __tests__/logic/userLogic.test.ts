import { NextFunction, Request, Response } from "express";
import { searchUser } from "../../src/logic/userLogic";
import { createMockMiddlewareParams } from "../testUtils";
import { IUserModel, UserModel } from "../../src/models/UserModel";
import { DynamicError } from "../../src/models/ErrorModel";

describe("searchUser", () => {
  let request: RequestQuerySearch;
  let response: Response;
  let nextFn: NextFunction;
  let findSpy: jest.SpyInstance;
  const user = {
    _id: "requestUserId",
  } as IUserModel;
  beforeEach(() => {
    const { req, next, res } = createMockMiddlewareParams<RequestQuerySearch>();
    request = req;
    response = res;
    nextFn = next;
    request.query.search = "someSearch";
    request.user = user;
    findSpy = jest.spyOn(UserModel, "find");
  });

  it("should call next with error when search is nullish", async () => {
    request.query.search = "";
    await searchUser(request, response, nextFn);
    expect(nextFn).toHaveBeenCalledWith(new DynamicError("Not Found!", 404));
  });
  it("should call next with error when DB find throws an error", async () => {
    const expectedErr = new DynamicError("Server Error", 500);
    findSpy.mockRejectedValueOnce("error");
    await searchUser(request, response, nextFn);
    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(nextFn).toHaveBeenCalledWith(expectedErr);
  });
  it("should respond 404 not found if no users were found", async () => {
    findSpy.mockResolvedValueOnce([]);
    await searchUser(request, response, nextFn);
    expect(nextFn).not.toHaveBeenCalled();
    expect(response.sendStatus).toHaveBeenCalledWith(404);
  });
  it("should respond 200 with users when users found", async () => {
    const users = [{ name: "ariel" }, { name: "david" }];
    findSpy.mockResolvedValueOnce(users);
    await searchUser(request, response, nextFn);
    expect(nextFn).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(users);
  });
});

type RequestQuerySearch = Request & {
  query: { search?: string };
  user: IUserModel;
};
