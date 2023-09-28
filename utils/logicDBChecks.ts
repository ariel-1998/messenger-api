import mongoose from "mongoose";
import { UserModel } from "../models/UserModel";

export const validateUsersArr = async (
  usersArr: mongoose.Schema.Types.ObjectId[]
) => {
  try {
    const userExistenceCheck = await UserModel.find({
      _id: { $in: usersArr },
    });
    if (userExistenceCheck.length !== usersArr.length) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};
