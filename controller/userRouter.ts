import { Router } from "express";
import { jwtVerification } from "../middleware/jwtVerification.ts";
import { searchUser } from "../logic/userLogic.ts";

export const userRouter = Router();
userRouter.use(jwtVerification);
userRouter.get("/", searchUser);
