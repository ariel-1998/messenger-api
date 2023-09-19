import mongoose from "mongoose";

type IChatModel = {
  chatName: string;
  isGroupChat: boolean;
  users: mongoose.Schema.Types.ObjectId[];
  latestMessage: mongoose.Schema.Types.ObjectId;
  groupAdmin: mongoose.Schema.Types.ObjectId;
} & mongoose.Document;

const chatSchema = new mongoose.Schema<IChatModel>(
  {
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

export const ChatModel = mongoose.model<IChatModel>("Chat", chatSchema);
