import { Router } from "express";
import { jwtVerification } from "../middleware/jwtVerification.ts";
import {
  getAllMessagesByChatId,
  getAllUnreadMessages,
  sendMessage,
  updateReadBy,
} from "../logic/messageLogic.ts";

export const messageRouter = Router();
messageRouter.use(jwtVerification);
messageRouter.route("/").post(sendMessage).put(updateReadBy);
messageRouter.post("/unread", getAllUnreadMessages);
messageRouter.get("/:chatId", getAllMessagesByChatId);
