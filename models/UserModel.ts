import mongoose from "mongoose";

type IUserModel = {
  name: string;
  email: string;
  password: string;
  image: string;
} & mongoose.Document;

const userSchema = new mongoose.Schema<IUserModel>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    image: {
      type: String,
      required: true,
      default: "", //need to add link
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUserModel>("User", userSchema);
