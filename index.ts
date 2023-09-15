import express, { json } from "express";

import * as dotenv from "dotenv";
dotenv.config();
const PORT = process.env.PORT;
const app = express();

app.use(json());

app.listen(PORT, () => console.log(`listenning on port ${PORT}`));
