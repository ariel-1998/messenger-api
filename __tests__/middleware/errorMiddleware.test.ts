import {
  RouteNotFound,
  errorHandler,
} from "../../src/middleware/errorMiddleware";
import { ErrorModel } from "../../src/models/ErrorModel";
import { createMockMiddlewareParams } from "../testUtils";

describe("RouteNotFound", () => {
  it("should run status and json with the right params", () => {
    const { next, req, res } = createMockMiddlewareParams();
    RouteNotFound(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "URL Not Found: someUrl",
    });
  });
});

describe("errorHandler", () => {
  it("should run default values in response if message and status are null / undefined", async () => {
    const { next, req, res } = createMockMiddlewareParams();
    errorHandler({} as ErrorModel, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server Error!" });
  });
  it("should run status and json with the right params", () => {
    const { next, req, res } = createMockMiddlewareParams();
    errorHandler({ message: "error", status: 401 }, req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "error" });
  });
});
