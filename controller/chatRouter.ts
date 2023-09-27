import { Router } from "express";
import { jwtVerification } from "../middleware/jwtVerification";
import {
  accessChat,
  addMembersToGroup,
  createGroupChat,
  getAllChats,
  renameGroup,
} from "../logic/chatLogic";

export const chatRouter = Router();

chatRouter.use(jwtVerification);

chatRouter.route("/").post(accessChat).get(getAllChats);
chatRouter.post("/group", createGroupChat);
chatRouter.put("/group/:groupId/rename", renameGroup);
chatRouter.put("/group/:groupId/members", addMembersToGroup);

// chatRouter.route("/group").post().put();
