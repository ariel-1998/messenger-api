import { Router } from "express";
import { jwtVerification } from "../middleware/jwtVerification";
import {
  getAllMessagesByChatId,
  getAllUnreadMessages,
  sendMessage,
  updateReadBy,
} from "../logic/messageLogic";

export const messageRouter = Router();
messageRouter.use(jwtVerification);
messageRouter.route("/").post(sendMessage).put(updateReadBy);
messageRouter.get("/unread", getAllUnreadMessages);
messageRouter.get("/chat/:chatId", getAllMessagesByChatId);
