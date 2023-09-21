import { Router } from "express";
import { UserModel } from "../models/UserModel";
import { loginUser, registerUser } from "../logic/userLogic";

export const userRouter = Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
