import { Router } from "express";
import { UserModel } from "../models/UserModel.js";
import { loginUser, registerUser } from "../logic/authLogic.js";

export const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
