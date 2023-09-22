import expressAsyncHandler from "express-async-handler";
import { CustomReq } from "../models/CustomReq";
import { NextFunction, Response } from "express";
import { DynamicErrorModel } from "../models/ErrorModel";

export const accessChat = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const { userId } = req.body;
    if (!userId)
      return next(new DynamicErrorModel("userId wasn't sent in the body"));
  }
);
