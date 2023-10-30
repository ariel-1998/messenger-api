import expressAsyncHandler from "express-async-handler";
import { CustomReq } from "../models/CustomReq";
import { NextFunction, Response } from "express";
import { DBErrorHandler, DynamicError } from "../models/ErrorModel";
import { MessageModel } from "../models/MessageModel";
import { ObjectId } from "mongoose";
import { ChatModel } from "../models/ChatModel";

export const sendMessage = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const { content, chat: chatId } = req.body as {
      content: string;
      chat: string;
    };
    const jwtUserId: ObjectId = req.user._id;
    if (!content || !chatId) {
      return next(new DynamicError("Content and chatId are required!"));
    }

    const newMsg = new MessageModel({
      content,
      chat: chatId,
      sender: jwtUserId,
      readBy: [],
    });

    try {
      let message = await MessageModel.create(newMsg);
      message = await message.populate("sender", "name image");
      message = await message.populate({
        path: "chat",
        populate: { path: "users", select: "-password" },
      });

      await ChatModel.findByIdAndUpdate(chatId, {
        latestMessage: message,
      });
      console.log("sendMessage");

      res.status(200).json(message);
    } catch (error) {
      next(DBErrorHandler.handle(error));
    }
  }
);

export const getAllMessagesByChatId = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const params = req.params as { chatId: string };
    const chatId = params.chatId;

    try {
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

    let chatsArr: string[];
    try {
      if (!chats) throw new Error();
      chatsArr = JSON.parse(chats.toString());
    } catch (error) {
      return next(new DynamicError("Chats were not provided!"));
    }

    try {
      const unreadMessages = await MessageModel.find({
        chat: { $in: chatsArr },
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
      next(new DynamicError("Server Error!", 500));
    }
  }
);

export const updateReadBy = expressAsyncHandler(
  async (req: CustomReq, res: Response, next: NextFunction) => {
    const readyByUserId: ObjectId = req.user._id;
    const { messages, chatId } = req.body as {
      messages: string[];
      chatId: string;
    };
    console.log("readby");

    if (!messages || !chatId.trim()) {
      return next(new DynamicError("Messages or chatId were not provided!"));
    }
    let messagesArr: string[];

    try {
      messagesArr = JSON.parse(messages.toString());
      if (!messagesArr.length) throw new Error();
    } catch (error) {
      return next(new DynamicError("Messages were not provided!"));
    }

    try {
      const chat = await ChatModel.findById(chatId);
      const isUserExistInChat = chat.users.find(
        (id) => id.toString() === readyByUserId.toString()
      );

      if (!isUserExistInChat) {
        return next(new DynamicError("User is not part of this chat!", 403));
      }

      const read = await MessageModel.updateMany(
        {
          _id: { $in: messagesArr },
          chat: chatId,
        },
        {
          $addToSet: { readBy: readyByUserId },
        }
      );
      res.sendStatus(200);
    } catch (error) {
      next(new DynamicError("Server Error!", 500));
    }
  }
);
