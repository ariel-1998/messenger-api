import expressAsyncHandler from "express-async-handler";
import { createJWT } from "../utils/createJWT.js";
import { DynamicError, MongoErrorModel } from "../models/ErrorModel.js";
import { IUserModel, UserModel } from "../models/UserModel.js";
import { NextFunction, Response, Request } from "express";
import { CredentialsModel } from "../models/CredentialsModel.js";

export const registerUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body as IUserModel;

    const isExist = await UserModel.findOne({ email });
    if (isExist) {
      return next(new DynamicError("User already exist", 409));
    }

    const rawUser: IUserModel = new UserModel(req.body);
    const errors = rawUser.validateSync();

    if (errors) return next(new MongoErrorModel(errors));

    const newUser = await rawUser.save();
    if (!rawUser) {
      return next(new DynamicError("Server error, try again later", 500));
    }
    const jwt = createJWT(newUser);
    res.status(201).json(jwt);
  }
);

export const loginUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body as CredentialsModel;

    const user = await UserModel.findOne({ email });
    if (user) {
      const isAuthorized = await user.passwordCompare(password);

      if (isAuthorized) {
        const jwt = createJWT(user);
        res.status(200).json(jwt);
        return;
      }
    }
    next(new DynamicError("Email or password are incorrect", 401));
  }
);
