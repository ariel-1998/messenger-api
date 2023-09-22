import { Router } from "express";
import { jwtVerification } from "../middleware/jwtVerification";
import { searchUser } from "../logic/userLogic";

export const userRouter = Router();
userRouter.use(jwtVerification);
userRouter.get("/search", searchUser);
