import expressAsyncHandler from "express-async-handler";
import { CustomReq } from "../models/CustomReq";
import { NextFunction, Response } from "express";
import { DynamicError, DBErrorHandler } from "../models/ErrorModel";
import { ChatModel, IChatModel } from "../models/ChatModel";
import { validateUsersArr } from "../utils/logicDBChecks";
import { ObjectId } from "mongoose";
import { UserModel } from "../models/UserModel";

export const accessChat = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const { userId } = req.body as { userId: string };
    const jwtUserId = req.user._id as ObjectId;
    if (!userId) {
      return next(new DynamicError("userId wasn't sent in the body"));
    }
    try {
      const isUser = await UserModel.findById(userId);
      if (!isUser) return next(new DynamicError("User does not exist!", 404));
      const chat = await ChatModel.findOne({
        isGroupChat: false,
        users: { $all: [userId, jwtUserId] },
      })
        .populate("users", "-password")
        .populate({
          path: "latestMessage",
          populate: { path: "sender", select: "-password" },
        });
      if (chat) return res.status(200).json(chat);
      const newChatData = new ChatModel({
        chatName: "null",
        isGroupChat: false,
        users: [userId, jwtUserId],
      });
      const createdChat = await ChatModel.create(newChatData);
      const poplateNewChat = await createdChat.populate("users", "-password");
      res.status(200).json(poplateNewChat);
    } catch (error) {
      console.log(error);
      next(new DynamicError("Server Error!", 500));
    }
  }
);

export const getAllChats = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    try {
      const jwtUserId = req.user._id as ObjectId;
      const chats = await ChatModel.find({
        users: { $elemMatch: { $eq: jwtUserId } },
        $or: [{ latestMessage: { $exists: true } }, { isGroupChat: true }],
      })
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate({
          path: "latestMessage",
          populate: { path: "sender", select: "-password" },
        })
        .sort({ updatedAt: -1 });
      res.json(chats);
    } catch (error) {
      next(new DynamicError("Serever Error!", 500));
    }
  }
);

export type CreateGroupChatReqBody = Pick<
  IChatModel,
  "users" | "chatName" | "groupImg"
>;
export const createGroupChat = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const jwtUserId = req.user._id as ObjectId;
    const { users, chatName, groupImg } = req.body as CreateGroupChatReqBody;

    if (
      !users ||
      !chatName ||
      typeof chatName !== "string" ||
      !chatName.trim()
    ) {
      return next(new DynamicError("users array and chatName are required!"));
    }

    if (groupImg)
      if (typeof groupImg !== "string")
        return next(new DynamicError("groupImg supposed to be a url string!"));

    // let usersArr: ObjectId[];
    try {
      //checks that its an array as well, if not it will throw an error
      if (!Array.isArray(users)) throw new Error();
      // usersArr = JSON.parse(JSON.stringify(users));
      if (users.length < 2) {
        return next(
          new DynamicError("Group chat must contain more than 2 users!", 400)
        );
      }
      const isExist = await validateUsersArr(users);
      if (!isExist) return next(new DynamicError("Invalid users!"));
    } catch (error) {
      return next(new DynamicError("users must be an array!"));
    }
    try {
      const createdGroup = await ChatModel.create({
        chatName,
        isGroupChat: true,
        groupAdmin: jwtUserId,
        groupImg,
        users: [...users, jwtUserId],
      });

      const populateGroup = await (
        await createdGroup.populate("users", "-password")
      ).populate("groupAdmin", "-password");
      res.status(201).json(populateGroup);
    } catch (error) {
      next(DBErrorHandler.handle(error));
    }
  }
);

export const deleteGroupChat = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    try {
      const jwtUserId = req.user._id as ObjectId;
      const { groupId } = req.params as { groupId: string };
      const deletedGroup = await ChatModel.findOneAndDelete({
        _id: groupId,
        groupAdmin: jwtUserId,
      });
      if (!deletedGroup) return next(new DynamicError("Group chat not found!"));
      res.sendStatus(204);
    } catch (error) {
      next(new DynamicError("Server Error!", 500));
    }
  }
);

export const renameGroup = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const { groupId } = req.params as { groupId: string };
    const { chatName } = req.body as Pick<IChatModel, "chatName">;
    const jwtUserId = req.user._id as ObjectId;
    console.log`groupId ${groupId}`;
    console.log`chatName ${chatName}`;
    try {
      if (!chatName || typeof chatName !== "string" || !chatName.trim()) {
        return next(new DynamicError("chatName is required!"));
      }
      const updatedChat = await ChatModel.findOneAndUpdate(
        {
          _id: groupId,
          users: { $elemMatch: { $eq: jwtUserId } },
        },
        { chatName },
        { return: true }
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate({
          path: "latestMessage",
          populate: { path: "sender", select: "-password" },
        });
      console.log(updatedChat);
      res.status(200).json(updatedChat);
    } catch (error) {
      next(new DynamicError("Group chat was not found!", 404));
    }
  }
);

export const addMembersToGroup = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const { groupId } = req.params as { groupId: string };
    const jwtUserId = req.user._id as ObjectId;
    const { users } = req.body as { users: string[] };
    // let usersArr: ObjectId[];

    // try {
    //   if (!users || !Array.isArray(users)) throw Error;
    //   // usersArr = JSON.parse(users);
    // } catch (error) {
    //   return next(new DynamicError("users array was not provided!"));
    // }
    try {
      if (!users || !Array.isArray(users))
        return next(new DynamicError("users array was not provided!"));
      if (!users.length) return next(new DynamicError("users array is empty"));

      const isExist = await validateUsersArr(users);
      // const isExist = await validateUsersArr(usersArr);
      if (!isExist) return next(new DynamicError("Invalid users!"));

      const updatedGroup = await ChatModel.findOneAndUpdate(
        {
          groupAdmin: jwtUserId,
          _id: groupId,
        },
        { $addToSet: { users: { $each: users } } },
        // { $addToSet: { users: { $each: usersArr } } },
        { new: true, runValidators: true }
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate({
          path: "latestMessage",
          populate: { path: "sender", select: "-password" },
        });

      if (!updatedGroup) {
        const errorMessage =
          "You do not have permission to add members to this group.";
        return next(new DynamicError(errorMessage, 403));
      }

      res.status(200).json(updatedGroup);
    } catch (error) {
      next(new DynamicError("Group chat was not found!"));
    }
  }
);

export const removeMembersFromGroup = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const params = req.params as { groupId: string; userId: string };
    const { groupId, userId } = params;
    const jwtUserId = req.user._id as ObjectId;
    let isGroup: IChatModel | null;
    let isNonAdminLeavingGroup = false;

    try {
      isGroup = await ChatModel.findById(groupId);
      if (!isGroup) throw Error();
    } catch (error) {
      return next(new DynamicError("Group chat was not found!", 404));
    }
    //verify its an admin or user trying to remove himself
    if (userId !== jwtUserId.toString()) {
      if (isGroup.groupAdmin.toString() !== jwtUserId.toString()) {
        const errMsg = "You do not have premission to remove this user";
        return next(new DynamicError(errMsg, 403));
      }
    }

    //verify that admin isnt removed from an active group chat
    if (isGroup.groupAdmin.toString() === userId) {
      const errMsg = "Admin cannot be removed from an active chat group!";
      return next(new DynamicError(errMsg, 403));
    }
    //checking if user wants to leave groupChat
    if (userId === jwtUserId.toString()) isNonAdminLeavingGroup = true;

    try {
      const initialArrLength = isGroup.users.length;
      isGroup.users = isGroup.users.filter((id) => id.toString() !== userId);
      if (isGroup.users.length === initialArrLength) {
        return next(new DynamicError("User not found!", 404));
      }

      const updatedGroup = await isGroup.save();
      if (isNonAdminLeavingGroup) {
        res.sendStatus(204);
        return;
      }
      let populatedGroup = await (
        await (
          await updatedGroup.populate("users", "-password")
        ).populate("groupAdmin", "-password")
      ).populate({
        path: "latestMessage",
        populate: { path: "sender", select: "-password" },
      });

      res.status(200).json(populatedGroup);
    } catch (error) {
      next(new DynamicError("Server Error!", 500));
    }
  }
);
