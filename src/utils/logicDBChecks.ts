import { ObjectId } from "mongoose";
import { UserModel } from "../models/UserModel";

export const validateUsersArr = async (usersArr: ObjectId[] | string[]) => {
  try {
    const userExistenceCheck = await UserModel.find({
      _id: { $in: usersArr },
    });
    if (userExistenceCheck.length !== usersArr.length) {
      return false;
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
