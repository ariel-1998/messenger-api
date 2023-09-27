import expressAsyncHandler from "express-async-handler";
import { CustomReq } from "../models/CustomReq";
import { NextFunction, Response } from "express";
import { DynamicError, DBErrorHandler } from "../models/ErrorModel";
import { ChatModel, IChatModel } from "../models/ChatModel";

export const accessChat = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const userId: string = req.body;
    const { _id: jwtUserId } = req.user;
    if (!userId) {
      return next(new DynamicError("userId wasn't sent in the body"));
    }

    const chat = await ChatModel.findOne({
      isGroupChat: false,
      users: { $all: [userId, jwtUserId] },
    })
      .populate("users", "-password")
      .populate({
        path: "latestMessage",
        populate: { path: "sender", select: "-password" },
      });

    if (chat) {
      res.status(200).json(chat);
      return;
    }
    const newChatData = new ChatModel({
      chatName: "null",
      isGroupChat: false,
      users: [userId, jwtUserId],
    });
    try {
      const createdChat = await ChatModel.create(newChatData);
      const poplateNewChat = await createdChat.populate("users", "-password");
      res.status(200).json(poplateNewChat);
    } catch (error) {
      next(new DynamicError("Server Error!", 500));
    }
  }
);

export const getAllChats = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    try {
      const { _id: jwtUserId } = req.user;
      const chats = await ChatModel.find({
        users: { $elemMatch: { $eq: jwtUserId } },
      })
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate({
          path: "latestMessage",
          populate: { path: "sender", select: "-password" },
        })
        .sort({ updatedAt: -1 }); //need to check if the sort works properly

      res.json(chats);
    } catch (error) {
      next(new DynamicError("Serever Error!", 500));
    }
  }
);

export const createGroupChat = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const jwtUserId = req.user._id;
    const { users, chatName } = req.body as Pick<
      IChatModel,
      "users" | "chatName"
    >;

    if (!users || !chatName.trim()) {
      return next(new DynamicError("users array and chatName are required!"));
    }

    let usersArr: string[];
    try {
      usersArr = JSON.parse(users.toString());
    } catch (error) {
      return next(new DynamicError("users must be an array!"));
    }

    if (usersArr.length < 2) {
      return next(
        new DynamicError("Group chat must contain more than 2 users!", 400)
      );
    }

    try {
      const createdGroup = await ChatModel.create({
        chatName,
        isGroupChat: true,
        groupAdmin: jwtUserId,
        users: [...usersArr, jwtUserId],
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

export const renameGroup = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const { groupId } = req.params as { groupId: string };
    const { chatName } = req.body as Pick<IChatModel, "chatName">;
    const { _id: jwtUserId } = req.user;
    if (!chatName.trim()) {
      return next(new DynamicError("chatName is required!"));
    }

    try {
      const updatedChat = await ChatModel.findOneAndUpdate(
        {
          _id: groupId,
          users: { $elemMatch: { $eq: jwtUserId } },
        },
        { chatName },
        { new: true }
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

      if (!updatedChat) {
        const errorMessage =
          "You do not have permission to change the group name for this group.";
        return next(new DynamicError(errorMessage, 403));
      }

      res.status(200).json(updatedChat);
    } catch (error) {
      next(new DynamicError("Group chat was not found!", 404));
    }
  }
);

export const addMembersToGroup = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {}
);
