import * as dotenv from "dotenv";
dotenv.config();

import { connectToDB } from "./utils/DB";

import { Server } from "socket.io";
import { IUserModel } from "./models/UserModel";
import { IChatModel } from "./models/ChatModel";
import { SocketChatModel, SocketMessageModel } from "./models/MessageModel";
import app from "./app";

const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
  console.log(`listenning on port ${PORT}`);
  connectToDB();
});

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_URL,
  },
});

io.on("connection", (socket) => {
  //create a room for each user that connects
  socket.on("setup", (userId: string) => {
    socket.join(userId);
    socket.emit("setup", true);
  });

  //mark messages as read
  socket.on("readMessage", (chat: SocketChatModel, userId: string) => {
    chat.users.forEach((user) => {
      if (user._id === userId) return;
      socket.to(user._id).emit("readMessage", chat, userId);
    });
  });

  //connectes user to a specific room, based on the chatId
  socket.on("joinChat", (chatId: string) => {
    socket.join(chatId);
  });

  // disconnect user when leaves the room
  socket.on("leaveChat", (chatId: string) => {
    socket.leave(chatId);
  });

  //tell the room who is typing
  socket.on("typing", (user: IUserModel, chatId) => {
    socket.broadcast.to(chatId).emit("typing", user.name);
  });

  //sending the message to all users that are connected to a specific room, excluding the sender himself
  socket.on("message", (message: SocketMessageModel) => {
    const { chat } = message;
    chat.users.forEach((user) => {
      if (user._id === message.sender._id) return;
      socket.to(user._id).emit("message", message);
    });
  });

  //added to group
  socket.on(
    "addingToGroup",
    (
      group: Omit<IChatModel, "users" | "groupAdmin"> & {
        users: IUserModel[];
        groupAdmin: IUserModel;
      }
    ) => {
      group.users.forEach((user) => {
        if (user._id === group._id) return;
        socket.to(user._id).emit("addedToGroup", group);
      });
    }
  );

  //removed from group
  socket.on(
    "removingFromGroup",
    (
      newChat: Omit<IChatModel, "users"> & { users: IUserModel[] },
      userToRemove: IUserModel
    ) => {
      newChat.users.forEach((user) => {
        socket.to(user._id).emit("removingFromGroup", newChat, userToRemove);
      });
      socket
        .to(userToRemove._id)
        .emit("removingFromGroup", newChat, userToRemove);
    }
  );

  //deleting group
  socket.on(
    "deletingGroup",
    (chat: Omit<IChatModel, "users"> & { users: IUserModel[] }) => {
      chat.users.forEach((user) => {
        socket.to(user._id).emit("deletingGroup", chat._id);
      });
    }
  );
});
