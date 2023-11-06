import { Router } from "express";
import { jwtVerification } from "../middleware/jwtVerification.ts";
import {
  accessChat,
  addMembersToGroup,
  createGroupChat,
  deleteGroupChat,
  getAllChats,
  removeMembersFromGroup,
  renameGroup,
} from "../logic/chatLogic.ts";

export const chatRouter = Router();

chatRouter.use(jwtVerification);

chatRouter.route("/").post(accessChat).get(getAllChats);
chatRouter.post("/group", createGroupChat);
chatRouter.delete("/group/:groupId", deleteGroupChat);
chatRouter.put("/group/:groupId/rename", renameGroup);
chatRouter.put("/group/:groupId/members", addMembersToGroup);
chatRouter.put("/group/:groupId/members/:userId", removeMembersFromGroup);
