import { Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { CustomReq } from "../models/CustomReq";
import jwt, { decode } from "jsonwebtoken";
import { IUserModel, UserModel } from "../models/UserModel";
import { DynamicError } from "../models/ErrorModel";

export const jwtVerification = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    try {
      const token = (req.headers.authorization as string).substring(7);
      jwt.verify(token, process.env.JWT_SECRET);
      const decoded = decodeToken<IUserModel>(token);
      console.log(decoded);
      const user = await UserModel.findById(decoded._id);
      if (!user) throw new Error();
      req.user = user as IUserModel;
      next();
    } catch (error) {
      console.log(error);
      next(new DynamicError("You are not signed in!", 401));
    }
  }
);

export function decodeToken<T>(token: string): T {
  const decodedToken = decode(token);
  return decodedToken as T;
}
