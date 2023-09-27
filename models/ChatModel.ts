import mongoose from "mongoose";

export type IChatModel = {
  _id: mongoose.Schema.Types.ObjectId;
  chatName: string;
  isGroupChat: boolean;
  users: mongoose.Schema.Types.ObjectId[];
  latestMessage: mongoose.Schema.Types.ObjectId;
  groupAdmin: mongoose.Schema.Types.ObjectId;
} & mongoose.Document;

const chatSchema = new mongoose.Schema<IChatModel>(
  {
    chatName: {
      type: String,
      trim: true,
      required: [true, "Password is required"],
    },
    isGroupChat: { type: Boolean, default: false },
    users: {
      type: [mongoose.Schema.Types.ObjectId],
      validate(val: any) {
        if (!Array.isArray(val))
          throw Error("Array of users was not provided!");
        if (!val.every((id: any) => mongoose.Types.ObjectId.isValid(id))) {
          throw Error("Invalid users were sent!");
        }
      },
      ref: "User",
    },
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ChatModel = mongoose.model<IChatModel>("Chat", chatSchema);
