import mongoose from "mongoose";
import { connectToDB } from "../../src/utils/DB";

process.env.MONGO_URI = "someUri";
jest.mock("mongoose");

describe("connectToDB", () => {
  it("should run mongoose connect function", async () => {
    (mongoose.connect as jest.Mock).mockResolvedValueOnce({
      connection: { host: "hello host" },
    });
    await connectToDB();
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
  });

  it("should throw an error when fails to connect", async () => {
    (mongoose.connect as jest.Mock).mockRejectedValueOnce(
      new Error("Connection failed")
    );
    try {
      await connectToDB();
    } catch (error) {
      expect(error.message).toBe("Connection failed");
    }
  });
});
