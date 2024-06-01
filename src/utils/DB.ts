import mongoose from "mongoose";

export const connectToDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to DB: ${connect.connection.host}`);
  } catch (error) {
    if (error && typeof error === "object" && "message" in error)
      console.log(`Error: ${error.message}`);
  }
};
