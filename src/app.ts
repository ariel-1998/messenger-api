import cors from "cors";
import express, { json } from "express";
import { authRouter } from "./controller/authRouter";
import { userRouter } from "./controller/userRouter";
import { chatRouter } from "./controller/chatRouter";
import { messageRouter } from "./controller/messageRouter";
import { RouteNotFound, errorHandler } from "./middleware/errorMiddleware";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_URL,
    methods: "POST,GET,PUT,DELETE",
  })
);

app.use(json());
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/message", messageRouter);

app.use("*", RouteNotFound);
app.use(errorHandler);

export default app;
