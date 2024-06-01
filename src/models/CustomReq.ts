import { Request } from "express";
import { IUserModel } from "./UserModel";

export type CustomReq = {
  user: IUserModel;
} & Request;
