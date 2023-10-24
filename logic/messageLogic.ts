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
    });

    try {
      let message = await MessageModel.create(newMsg);
      message = await message.populate("sender", "name image _id");
      message = await message.populate("chat");
      //check if need to populate users, (in the video its with populated users)!!!
      //   let message = await MessageModel.create(newMsg);
      //   message = await message.populate("sender", "name image");
      //   message = await message.populate({
      //     path: "chat",
      //     populate: { path: "users", select: "-password" },
      //   });

      await ChatModel.findByIdAndUpdate(chatId, {
        latestMessage: message,
      });
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
        .populate("chat");
      //check if need to populate users, (in the video its with NOOOO populated users)!!!
      //   const messages = await MessageModel.find({
      //     chat: chatId,
      //   }).populate("sender", "-password").populate({
      //     path: "chat",
      //     populate: { path: "users", select: "-password" },
      //   });
      res.status(200).json(messages);
    } catch (error) {
      next(new DynamicError("Server Error!", 500));
    }
  }
);
