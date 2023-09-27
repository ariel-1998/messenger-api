import mongoose from "mongoose";

export type IMessageModel = {
  _id: mongoose.Schema.Types.ObjectId;
  sender: mongoose.Schema.Types.ObjectId;
  content: string;
  chat: mongoose.Schema.Types.ObjectId;
} & mongoose.Document;

const messageSchema = new mongoose.Schema<IMessageModel>(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "chat" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const MessageModel = mongoose.model<IMessageModel>(
  "Message",
  messageSchema
);
