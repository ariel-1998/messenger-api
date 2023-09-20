import express, { json } from "express";
import * as dotenv from "dotenv";
import { connectToDB } from "./dataLayer/DB";
import { userRouter } from "./controller/userRoute";

dotenv.config();
const PORT = process.env.PORT || 3001;
const app = express();

app.use(json());
app.use("/api/user", userRouter);

app.listen(PORT, () => {
  console.log(`listenning on port ${PORT}`);
  connectToDB();
});
