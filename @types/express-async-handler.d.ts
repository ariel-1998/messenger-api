// types/express-async-handler.d.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import { IUserModel } from "./path/to/UserModel"; // Adjust the path accordingly
import { CustomReq } from "../src/models/CustomReq";

declare module "express-async-handler" {
  export default function expressAsyncHandler<
    Req extends CustomReq,
    Res = Response,
    Next = NextFunction
  >(handler: (req: Req, res: Res, next: Next) => any): RequestHandler;
}
