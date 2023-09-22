import { Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { CustomReq } from "../models/CustomReq";
import { UserModel } from "../models/UserModel";

export const searchUser = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const { search } = req.query;
    const { _id: reqUserId } = req.user;
    if (search) {
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
      return;
    }
    res.sendStatus(404);
  }
);

//   const users = await UserModel.find({
//     $or: [
//       { name: search, $options: "i" },
//       { email: search, $options: "i" },
//     ],
//   }).find({ _id: { $ne: req.user._id } });
