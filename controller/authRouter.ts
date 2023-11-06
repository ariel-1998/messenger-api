import { Router } from "express";
import { UserModel } from "../models/UserModel.ts";
import { loginUser, registerUser } from "../logic/authLogic.ts";

export const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
