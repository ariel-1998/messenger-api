import { Router } from "express";
import { jwtVerification } from "../middleware/jwtVerification";

export const chatRouter = Router();

chatRouter.use(jwtVerification);

// chatRouter.route("/").post(accessChat)

// chatRouter.route("/group").post().put();

// chatRouter.route("/group").post().put();
