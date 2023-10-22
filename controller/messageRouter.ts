import { Router } from "express";
import { jwtVerification } from "../middleware/jwtVerification";
import { getAllMessagesByChatId, sendMessage } from "../logic/messageLogic";

export const messageRouter = Router();
messageRouter.use(jwtVerification);
messageRouter.post("/", sendMessage);
messageRouter.get("/:chatId", getAllMessagesByChatId);
