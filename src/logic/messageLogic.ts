import expressAsyncHandler from "express-async-handler";
import { CustomReq } from "../models/CustomReq";
import { NextFunction, Response } from "express";
import { DBErrorHandler, DynamicError } from "../models/ErrorModel";
import { MessageModel } from "../models/MessageModel";
import { ObjectId } from "mongoose";
import { ChatModel } from "../models/ChatModel";

export type SendMessageBody = {
  content: string;
  chat: string;
};
export const sendMessage = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    console.log("here");
    const {
      content,
      chat: chatId,
      // frontendTimeStamp,
    } = req.body as SendMessageBody;
    const jwtUserId: ObjectId = req.user._id;

    const newMsg = new MessageModel({
      content,
      chat: chatId,
      sender: jwtUserId,
      readBy: [],
      // frontendTimeStamp,
    });

    if (!content || typeof content !== "string" || !content.trim() || !chatId)
      return next(new DynamicError("Content or chat are invalid", 400));

    try {
      const chat = await ChatModel.findById(chatId);
      if (!chat) return next(new DynamicError("Chat was not found", 404));

      const userIndex = chat.users.findIndex(
        (userId) => userId.toString() === jwtUserId.toString()
      );

      if (userIndex === -1)
        return next(
          new DynamicError(
            "Cannot send message to a chat you are not part of",
            403
          )
        );

      let message = await MessageModel.create(newMsg);

      message = await message.populate("sender", "name image");

      message = await message.populate({
        path: "chat",
        populate: { path: "users", select: "-password" },
      });

      try {
        await ChatModel.findByIdAndUpdate(chatId, {
          latestMessage: message,
        });
      } catch (error) {
        console.log(error);
      }

      res.status(200).json(message);
    } catch (error) {
      return next(DBErrorHandler.handle(error));
    }
  }
);

export const getAllMessagesByChatId = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const { chatId } = req.params as { chatId: string };
    const jwtUserId: ObjectId = req.user._id;

    try {
      const chat = await ChatModel.findById(chatId);
      if (!chat) return next(new DynamicError("Chat was not found", 404));

      const userIndex = chat.users.findIndex(
        (userId) => userId.toString() === jwtUserId.toString()
      );

      if (userIndex === -1)
        return next(
          new DynamicError(
            "Cannot recive messages from a chat that you are not part of.",
            403
          )
        );

      const messages = await MessageModel.find({
        chat: chatId,
      })
        .populate("sender", "-password")
        .populate({
          path: "chat",
          populate: { path: "users", select: "-password" },
        });
      res.status(200).json(messages);
    } catch (error) {
      next(new DynamicError("Server Error!", 500));
    }
  }
);
//this is the only thing i need to change in tests
export const getAllUnreadMessages = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const userId: ObjectId = req.user._id;
    // const { chats } = req.body as { chats: string[] };
    //might not need chats but instead get all chats by the users inside chat users array
    //and then get all unread messages by those chats, that way there is no need for checking if part of chat
    try {
      const userChats = await ChatModel.find({ users: userId });
      if (!userChats.length)
        return next(new DynamicError("Chats were not found", 404));

      const chatIds: ObjectId[] = userChats.map((chat) => chat._id);
      // if (!chats || !Array.isArray(chats))
      //   return next(new DynamicError("Chats Array was not provided!"));

      const unreadMessages = await MessageModel.find({
        chat: { $in: chatIds },
        sender: { $ne: userId },
        readBy: { $nin: [userId] },
      })
        .populate("sender", "name image _id")
        .populate({
          path: "chat",
          populate: { path: "users", select: "-password" },
        });
      res.status(200).json(unreadMessages);
    } catch (error) {
      console.log(error);
      next(new DynamicError("Server Error!", 500));
    }
  }
);

export const updateReadBy = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const readyByUserId: ObjectId = req.user._id;
    const { chatId } = req.body as {
      // messages: string[];
      chatId: unknown;
    };
    try {
      if (!chatId || typeof chatId !== "string" || !chatId.trim())
        return next(new DynamicError("chatId was not provided!"));
      // if (!messages || !Array.isArray(messages) || !messages.length)
      // return next(new DynamicError("Messages were not provided!"));

      const chat = await ChatModel.findById(chatId);
      if (!chat) return next(new DynamicError("Chat was not found", 404));
      const isUserExistInChat = chat.users.findIndex(
        (id) => id.toString() === readyByUserId.toString()
      );

      if (isUserExistInChat === -1)
        return next(new DynamicError("User is not part of this chat!", 403));

      await MessageModel.updateMany(
        {
          chat: chatId,
          sender: { $ne: readyByUserId },
          readBy: { $nin: [readyByUserId] },
        },
        {
          $addToSet: { readBy: readyByUserId },
        }
      );
      const populatedChat = await chat.populate("users");
      res.status(200).json(populatedChat);
    } catch (error) {
      console.log(error);
      next(new DynamicError("Server Error!", 500));
    }
  }
);
