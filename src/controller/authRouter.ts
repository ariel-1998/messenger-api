import { Router } from "express";
import { loginUser, registerUser } from "../logic/authLogic";

export const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
