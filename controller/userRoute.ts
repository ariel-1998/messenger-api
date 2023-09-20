import { Router } from "express";
import { UserModel } from "../models/UserModel";
import { registerUser } from "../logic/userLogic";

export const userRouter = Router();

userRouter.post("/register", async (req, res, next) => {
  const user = new UserModel(req.body);
  try {
    const acceptedUser = await registerUser(user);
    res.json(acceptedUser);
  } catch (error) {
    console.log(error);
    res.status(400).json(error);
  }
});
