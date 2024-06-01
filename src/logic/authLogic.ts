import expressAsyncHandler from "express-async-handler";
import { createJWT } from "../utils/createJWT";
import { DynamicError, MongoErrorModel } from "../models/ErrorModel";
import { IUserModel, UserModel } from "../models/UserModel";
import { NextFunction, Response, Request } from "express";
import { CredentialsModel } from "../models/CredentialsModel";

export const registerUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body as IUserModel;
    //add vailate email
    try {
      const isExist = await UserModel.findOne({ email });
      if (isExist) {
        return next(new DynamicError("User already exist", 409));
      }

      const rawUser: IUserModel = new UserModel(req.body);
      const errors = rawUser.validateSync();
      if (errors) return next(new MongoErrorModel(errors));

      const newUser = await rawUser.save();
      if (!newUser) {
        return next(new DynamicError("Server error, try again later", 500));
      }
      const jwt = createJWT(newUser);

      res.status(201).json(jwt);
    } catch (error) {
      next(new DynamicError("Server Error.", 500));
    }
  }
);

export const loginUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body as CredentialsModel;
    if (!email || !password)
      return next(new DynamicError("Email or password were not provided", 400));
    try {
      const user = await UserModel.findOne({ email });
      if (user) {
        const isAuthorized = await user.passwordCompare(password);
        console.log("isAuthorized", isAuthorized);
        if (isAuthorized) {
          const jwt = createJWT(user);
          return res.status(200).json(jwt);
        }
      }
      next(new DynamicError("Email or password are incorrect", 401));
    } catch (error) {
      console.log("error", error);
      next(new DynamicError("Server Error.", 500));
    }
  }
);
