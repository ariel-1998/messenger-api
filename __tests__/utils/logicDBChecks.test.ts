import { ObjectId } from "mongoose";
import { UserModel } from "../../src/models/UserModel";
import { validateUsersArr } from "../../src/utils/logicDBChecks";

jest.mock("../../src/models/UserModel", () => ({
  UserModel: {
    find: jest.fn(),
  },
}));

describe("validateUsersArr", () => {
  it("should return false when resolved array length different then arument array length", async () => {
    (UserModel.find as jest.Mock).mockResolvedValueOnce([
      { user1: "user1" },
      { user2: "user2" },
    ]);
    const isExist = await validateUsersArr([]);
    expect(isExist).toBe(false);
  });
  it("should return true if the length of args array matches the length of resolved data", async () => {
    (UserModel.find as jest.Mock).mockResolvedValueOnce([
      { user1: "user1" },
      { user2: "user2" },
    ]);
    const args = ["1", "2"] as unknown as ObjectId[];
    const isExist = await validateUsersArr(args);
    expect(isExist).toBe(true);
  });
  it("should return false when error accures", async () => {
    (UserModel.find as jest.Mock).mockRejectedValueOnce("");
    const args = ["1", "2"] as unknown as ObjectId[];
    const isExist = await validateUsersArr(args);
    expect(isExist).toBe(false);
  });
});
