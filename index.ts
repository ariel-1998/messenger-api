import express, { json } from "express";
import * as dotenv from "dotenv";
import { connectToDB } from "./utils/DB";
import { authRouter } from "./controller/authRouter";
import { RouteNotFound, errorHandler } from "./middleware/errorMiddleware";
import cors from "cors";
import { userRouter } from "./controller/userRouter";
import { chatRouter } from "./controller/chatRouter";
import { messageRouter } from "./controller/messageRouter";
import { Server } from "socket.io";
import { IUserModel } from "./models/UserModel";
import { IChatModel } from "./models/ChatModel";
import { MessageModel, SocketMessageModel } from "./models/MessageModel";
dotenv.config();
const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors());
app.use(json());
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/message", messageRouter);

app.use(RouteNotFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`listenning on port ${PORT}`);
  connectToDB();
});

const io = new Server(server, {
  pingTimeout: 2 * 60 * 1000,
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  //create a room for each user that connects

  socket.on("setup", (userId: string) => {
    try {
      socket.join(userId);
      socket.emit("setup", true);
      console.log("setup", userId);
    } catch (error) {
      socket.emit("setup", false);
    }
  });

  //connectes user to a specific room, based on the chatId
  // socket.on("joinChat", (chatId: string) => {
  //   socket.join(chatId);
  //   console.log("join", chatId);
  // });

  //disconnect user when leaves the room
  // socket.on("leaveChat", (chatId: string) => {
  //   socket.leave(chatId);
  //   console.log("left", chatId);
  // });

  //sending the message to all users that are connected to a specific room, excluding the sender himself
  socket.on("message", (message: SocketMessageModel) => {
    try {
      const { chat } = message;

      //i dont use brodcast if someone leaves the groupChat i only want the the ones
      //that are still in the group to get the message, and not who is in the room but left the group
      chat.users.forEach((userId) => {
        if (userId === message.sender._id) return;
        // socket.in(userId).emit("message", message);
        socket.to(userId).emit("message", message);
      });
      console.log("messaged", message);

      // chat.users.forEach((userId) => {
      //   if (userId === message.sender._id) return;
      //   socket.in(userId).emit("message", message);
      // });
      // socket.broadcast.to(chat._id).emit("message", message);
    } catch (error) {
      console.log(error.message);
    }
  });
});
