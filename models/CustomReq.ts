import { Request } from "express";
import { IUserModel } from "./UserModel.js";

export type CustomReq = {
  user: IUserModel;
} & Request;
