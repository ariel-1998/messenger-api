import { IUserModel } from "../models/UserModel";
import jwt from "jsonwebtoken";

export function createJWT(user: IUserModel) {
  const { _id, name, email, image } = user;
  return jwt.sign(
    {
      sub: _id,
      name,
      email,
      image,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}
