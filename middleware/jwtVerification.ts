import { Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { CustomReq } from "../models/CustomReq";
import jwt, { decode } from "jsonwebtoken";
import { IUserModel, UserModel } from "../models/UserModel";
import { DynamicErrorModel } from "../models/ErrorModel";

export const jwtVerification = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    try {
      console.log;
      const token = req.headers.authorization.substring(7);
      jwt.verify(token, process.env.JWT_SECRET); //change it later
      const decoded = decodeToken<IUserModel>(token);
      req.user = await UserModel.findById(decoded._id); //change it later
      next();
    } catch (error) {
      next(new DynamicErrorModel("You are not signed in!", 401));
    }
  }
);

function decodeToken<T>(token: string): T {
  const decodedToken = decode(token);
  return decodedToken as T;
}
