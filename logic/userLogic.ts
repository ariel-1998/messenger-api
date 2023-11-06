import { Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { CustomReq } from "../models/CustomReq.ts";
import { UserModel } from "../models/UserModel.ts";
import { DynamicError } from "../models/ErrorModel.ts";
import { ObjectId } from "mongoose";

export const searchUser = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const { search } = req.query;
    const reqUserId = req.user._id as ObjectId;
    if (!search) return next(new DynamicError("Not Found!", 404));

    const users = await UserModel.find({
      $and: [
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        },
        { _id: { $ne: reqUserId } },
      ],
    });
    users.length ? res.status(200).json(users) : res.sendStatus(404);
  }
);
