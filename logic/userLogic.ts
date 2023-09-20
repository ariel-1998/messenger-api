import { IUserModel, UserModel } from "../models/UserModel";

export async function registerUser(user: IUserModel): Promise<IUserModel> {
  const { email } = user;
  const isExist = await UserModel.findOne({ email });
  if (isExist) {
    throw new Error("Email already exist");
  }
  const registeredUser = await UserModel.create(user);
  return registeredUser;
}
