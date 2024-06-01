import expressAsyncHandler from "express-async-handler";
import { CustomReq } from "../models/CustomReq";
import { NextFunction, Response } from "express";
import {
  DBErrorHandler,
  DynamicError,
  MongoErrorModel,
} from "../models/ErrorModel";
import { IMessageModel, MessageModel } from "../models/MessageModel";
import mongoose, { ObjectId, startSession } from "mongoose";
import { ChatModel } from "../models/ChatModel";
export type SendMessageBody = {
  content: string;
  chat: string;
  frontendTimeStamp: Date;
};
export const sendMessage = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    let session: mongoose.mongo.ClientSession | undefined = undefined;
    const {
      content,
      chat: chatId,
      frontendTimeStamp,
    } = req.body as SendMessageBody;
    const jwtUserId: ObjectId = req.user._id;

    const newMsg = new MessageModel({
      content,
      chat: chatId,
      sender: jwtUserId,
      readBy: [],
      frontendTimeStamp,
    });

    if (!content || !chatId)
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

      session = await startSession();
      session.startTransaction();
      let message: IMessageModel;

      const messageArr = await MessageModel.create([newMsg], { session });
      message = messageArr[0];
      message = await message.populate("sender", "name image");

      message = await message.populate({
        path: "chat",
        populate: { path: "users", select: "-password" },
      });
      await ChatModel.findByIdAndUpdate(chatId, {
        latestMessage: message,
      }).session(session);
      await session.commitTransaction();
      res.status(200).json(message);
    } catch (error) {
      try {
        await session?.abortTransaction();
      } catch (error) {}
      return next(DBErrorHandler.handle(error));
    } finally {
      session?.endSession();
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

export const getAllUnreadMessages = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const userId: ObjectId = req.user._id;
    const { chats } = req.body as { chats: string[] };
    try {
      // let chatsArr: string[];
      // try {
      if (!chats || !Array.isArray(chats))
        return next(new DynamicError("Chats Array was not provided!"));

      // chatsArr = JSON.parse(chats.toString());
      // } catch (error) {
      // }

      const unreadMessages = await MessageModel.find({
        chat: { $in: chats },
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
    const { messages, chatId } = req.body as {
      messages: string[];
      chatId: unknown;
    };
    try {
      if (!chatId || typeof chatId !== "string" || !chatId.trim())
        return next(new DynamicError("chatId was not provided!"));
      // let messagesArr: string[];

      // try {
      if (!messages || !Array.isArray(messages) || !messages.length)
        return next(new DynamicError("Messages were not provided!"));

      // messagesArr = JSON.parse(messages.toString());
      // if (!messagesArr.length) throw new Error();
      // } catch (error) {
      // return next(new DynamicError("Messages were not provided!"));
      // }

      const chat = await ChatModel.findById(chatId);
      if (!chat) return next(new DynamicError("Chat was not found", 404));
      const isUserExistInChat = chat.users.findIndex(
        (id) => id.toString() === readyByUserId.toString()
      );

      if (isUserExistInChat === -1)
        return next(new DynamicError("User is not part of this chat!", 403));

      await MessageModel.updateMany(
        {
          _id: { $in: messages },
          chat: chatId,
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
