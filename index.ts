import express, { json } from "express";
import * as dotenv from "dotenv";
import { connectToDB } from "./dataLayer/DB";
import { authRouter } from "./controller/authRouter";
import { RouteNotFound, errorHandler } from "./middleware/errorMiddleware";
import cors from "cors";
import { userRouter } from "./controller/userRouter";
import { chatRouter } from "./controller/chatRouter";

dotenv.config();
const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors());
app.use(json());
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);

app.use(RouteNotFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`listenning on port ${PORT}`);
  connectToDB();
});
