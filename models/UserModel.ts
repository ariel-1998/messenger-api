import mongoose from "mongoose";
import bcrypt from "bcrypt";

type IUserMethods = {
  passwordCompare: (enteredPassword: string) => Promise<boolean>;
};

export type IUserModel = {
  _id: mongoose.Schema.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  image: string;
} & mongoose.Document &
  IUserMethods;

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
      default:
        "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
  } catch (error) {
    next(error);
  }
});

userSchema.methods.passwordCompare = async function (
  this: IUserModel,
  enteredPassword: string
) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const UserModel = mongoose.model<IUserModel>("User", userSchema);
