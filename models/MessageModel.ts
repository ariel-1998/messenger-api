import mongoose from "mongoose";
import { IUserModel } from "./UserModel.ts";
import { IChatModel } from "./ChatModel.ts";

export type IMessageModel = {
  _id: mongoose.Schema.Types.ObjectId;
  sender: mongoose.Schema.Types.ObjectId;
  content: string;
  chat: mongoose.Schema.Types.ObjectId;
  readBy: mongoose.Schema.Types.ObjectId[];
  frontendTimeStamp: Date;
} & mongoose.Document;

const messageSchema = new mongoose.Schema<IMessageModel>(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: {
      type: String,
      trim: true,
      required: [true, "Message was not provided!"],
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      validate(value: string) {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw Error("Invalid users were sent!");
        }
      },
      required: [true, "chatId was not provided!"],
      ref: "Chat",
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    frontendTimeStamp: {
      type: Date,
      required: [true, "frontendTimeStamp was not provided!"],
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const MessageModel = mongoose.model<IMessageModel>(
  "Message",
  messageSchema
);

export type SocketMessageModel = {
  _id: string;
  sender: Omit<IUserModel, "password">;
  content: string;
  chat: SocketChatModel;
};

export type SocketChatModel = Omit<IChatModel, "users"> & {
  users: IUserModel[];
};
