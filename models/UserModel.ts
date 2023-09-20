import mongoose from "mongoose";

export type IUserModel = {
  name: string;
  email: string;
  password: string;
  image: string;
} & mongoose.Document;

const userSchema = new mongoose.Schema<IUserModel>(
  {
    name: { type: String, required: [true, "Name is required"] },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    password: { type: String, required: [true, "Password is required"] },
    image: {
      type: String,
      default: "asd", //need to add link
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUserModel>("User", userSchema);
