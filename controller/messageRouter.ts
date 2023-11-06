import { Router } from "express";
import { jwtVerification } from "../middleware/jwtVerification.js";
import {
  getAllMessagesByChatId,
  getAllUnreadMessages,
  sendMessage,
  updateReadBy,
} from "../logic/messageLogic.js";

export const messageRouter = Router();
messageRouter.use(jwtVerification);
messageRouter.route("/").post(sendMessage).put(updateReadBy);
messageRouter.post("/unread", getAllUnreadMessages);
messageRouter.get("/:chatId", getAllMessagesByChatId);
