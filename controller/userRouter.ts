import { Router } from "express";
import { jwtVerification } from "../middleware/jwtVerification.js";
import { searchUser } from "../logic/userLogic.js";

export const userRouter = Router();
userRouter.use(jwtVerification);
userRouter.get("/", searchUser);
