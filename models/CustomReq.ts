import { Request } from "express";
import { IUserModel } from "./UserModel.ts";

export type CustomReq = {
  user: IUserModel;
} & Request;
