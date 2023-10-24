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
import { SocketMessageModel } from "./models/MessageModel";
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
    origin: "http://localhost:5173",
  },
});

io.on("connection", (socket) => {
  socket.on("setup", (userData: { _id: string }) => {
    try {
      socket.join(userData._id);
      socket.emit("connected");
      console.log("connected to room", userData._id);
    } catch (error) {
      console.log(error.message);
    }
  });

  socket.on("joinChat", (chat: { _id: string }) => {
    try {
      socket.join(chat._id);
      console.log("connected to room", chat._id);
    } catch (error) {
      console.log(error.message);
    }
  });

  socket.on("message", (message: SocketMessageModel) => {
    try {
      const { chat } = message;
      if (!chat.users) return console.log("users not defined!");

      chat.users.forEach((userId) => {
        if (userId === message.sender._id) return;
        socket.in(userId).emit("message", message);
      });
    } catch (error) {
      console.log(error.message);
    }
  });
});
