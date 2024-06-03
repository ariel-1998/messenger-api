import { NextFunction, Request, Response } from "express";
import {
  createMockMiddlewareParams,
  generateValidationError,
} from "../testUtils";
import { IUserModel, UserModel } from "../../src/models/UserModel";
import {
  CreateGroupChatReqBody,
  accessChat,
  addMembersToGroup,
  createGroupChat,
  deleteGroupChat,
  getAllChats,
  removeMembersFromGroup,
  renameGroup,
} from "../../src/logic/chatLogic";
import { CustomReq } from "../../src/models/CustomReq";
import { DBErrorHandler, DynamicError } from "../../src/models/ErrorModel";
import { ChatModel, IChatModel } from "../../src/models/ChatModel";
import { ObjectId } from "mongoose";
import * as dbChecks from "../../src/utils/logicDBChecks";

jest.mock("../../src/models/UserModel");
jest.mock("../../src/models/ChatModel");

const mockUser = {
  name: "name",
  email: "email@gmail.com",
  _id: "reqUserId",
  image: "someUrl",
} as IUserModel;
const userFound = {
  name: "name2",
  email: "mail@mail.com",
  password: "somePassword",
  image: "someUrl",
  _id: "someId",
} as IUserModel;
const chat = {
  _id: "chatId",
  chatName: "null",
  isGroupChat: false,
  users: [userFound._id, mockUser._id],
  latestMessage: "" as unknown as ObjectId,
  groupAdmin: "" as unknown as ObjectId,
  groupImg: "",
} as IChatModel;
const createGroupChatBody: CreateGroupChatReqBody = {
  chatName: "chatName",
  groupImg: "someUrl",
  users: chat.users,
};
const adminId = "adminId";
const groupChat = {
  _id: "chatId",
  chatName: "null",
  isGroupChat: true,
  users: [userFound._id, mockUser._id],
  latestMessage: "" as unknown as ObjectId,
  groupAdmin: adminId as unknown as ObjectId,
  groupImg: "",
} as IChatModel;
describe("chatLogic", () => {
  let request: CustomReq;
  let response: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    const { next, req, res } = createMockMiddlewareParams<CustomReq>();
    request = req;
    response = res;
    nextFn = next;
    request.user = { ...mockUser } as IUserModel;
  });
  describe("accessChat", () => {
    beforeEach(() => {
      request.body = { userId: "userId" };
      (UserModel.findById as jest.Mock).mockResolvedValue(userFound);
      (ChatModel.findOne as jest.Mock).mockImplementation(() => {
        const secondPopulate = {
          populate: jest.fn().mockResolvedValue(null),
        };
        const firstPopulate = {
          populate: jest.fn().mockReturnValueOnce(secondPopulate),
        };
        return firstPopulate;
      });
    });
    it("should call next when userId doesnt exist in body", () => {
      request.body = { userId: "" };
      accessChat(request, response, nextFn);
      const expectedError = new DynamicError("userId wasn't sent in the body");
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedError);
    });
    it("should call next with error when requested user was not found in DB", async () => {
      (UserModel.findById as jest.Mock).mockResolvedValueOnce(null);
      const expectedError = new DynamicError("User does not exist!", 404);
      await accessChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedError);
    });
    it("should call next if findById user function throws an error", async () => {
      (UserModel.findById as jest.Mock).mockRejectedValueOnce("error");
      const expectedError = new DynamicError("Server Error!", 500);
      await accessChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedError);
    });
    it("should call next if findOne chat function throws an error", async () => {
      (ChatModel.findOne as jest.Mock).mockImplementationOnce(() => {
        const secondPopulate = {
          populate: jest.fn().mockRejectedValueOnce("error"),
        };
        const firstPopulate = {
          populate: jest.fn().mockReturnValueOnce(secondPopulate),
        };
        return firstPopulate;
      });
      const expectedError = new DynamicError("Server Error!", 500);
      await accessChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedError);
    });
    it("should respond with the already existed chat if findOne chat function returns chat", async () => {
      (ChatModel.findOne as jest.Mock).mockImplementationOnce(() => {
        const secondPopulate = {
          populate: jest.fn().mockReturnValueOnce(chat),
        };
        const firstPopulate = {
          populate: jest.fn().mockReturnValueOnce(secondPopulate),
        };
        return firstPopulate;
      });
      await accessChat(request, response, nextFn);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(chat);
    });
    it("should call next with error when ChatModel.create throws an error", async () => {
      (ChatModel.create as jest.Mock).mockRejectedValueOnce("error");
      await accessChat(request, response, nextFn);
      const expectedError = new DynamicError("Server Error!", 500);
      expect(nextFn).toHaveBeenCalledWith(expectedError);
    });
    it("should call next when chat.populate throws an error", async () => {
      (ChatModel.create as jest.Mock).mockResolvedValueOnce({
        ...chat,
        populate: jest.fn().mockRejectedValueOnce("someError"),
      });
      await accessChat(request, response, nextFn);
      const expectedError = new DynamicError("Server Error!", 500);
      expect(nextFn).toHaveBeenCalledWith(expectedError);
    });
    it("should respond with chat when successfuly created", async () => {
      (ChatModel.create as jest.Mock).mockResolvedValueOnce({
        ...chat,
        populate: jest.fn().mockResolvedValueOnce(chat),
      });
      await accessChat(request, response, nextFn);
      expect(response.json).toHaveBeenCalledWith(chat);
      expect(response.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getAllChats", () => {
    it("should call next with error when ChatModel.find throws an error", async () => {
      (ChatModel.find as jest.Mock).mockImplementation(() => {
        const mockPopulate = jest.fn().mockReturnThis();
        const mockSort = jest.fn().mockRejectedValueOnce("errror");
        return {
          populate: mockPopulate,
          sort: mockSort,
        };
      });
      const expectedError = new DynamicError("Serever Error!", 500);
      await getAllChats(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledWith(expectedError);
    });
    it("should respond with chats when successfuly gets chats", async () => {
      (ChatModel.find as jest.Mock).mockImplementationOnce(() => {
        const mockPopulate = jest.fn().mockReturnThis();
        const mockSort = jest.fn().mockResolvedValueOnce([chat]);
        return {
          populate: mockPopulate,
          sort: mockSort,
        };
      });
      await getAllChats(request, response, nextFn);
      expect(response.json).toHaveBeenCalledWith([chat]);
    });
    it("should respond with chats when getsan empty chats array", async () => {
      (ChatModel.find as jest.Mock).mockImplementationOnce(() => {
        const mockPopulate = jest.fn().mockReturnThis();
        const mockSort = jest.fn().mockResolvedValueOnce([]);
        return {
          populate: mockPopulate,
          sort: mockSort,
        };
      });
      await getAllChats(request, response, nextFn);
      expect(response.json).toHaveBeenCalledWith([]);
    });
  });

  describe("createGroupChat", () => {
    let validateUsersArr: jest.SpyInstance;
    beforeEach(() => {
      request.body = { ...createGroupChatBody };
      validateUsersArr = jest
        .spyOn(dbChecks, "validateUsersArr")
        .mockResolvedValue(true);
      (ChatModel.create as jest.Mock).mockImplementation(() => {
        return {
          populate: jest.fn().mockReturnValueOnce({
            populate: jest.fn().mockReturnValueOnce(chat),
          }),
        };
      });
    });

    it("should call next with error if users is nullish", () => {
      request.body.users = null;
      const expectedErr = new DynamicError(
        "users array and chatName are required!"
      );
      createGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error if chatName is nullish", () => {
      request.body.chatName = null;
      const expectedErr = new DynamicError(
        "users array and chatName are required!"
      );
      createGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error if chatName is not a string", () => {
      request.body.chatName = 123;
      const expectedErr = new DynamicError(
        "users array and chatName are required!"
      );
      createGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error if chatName can be trimmed to nullish value", () => {
      request.body.chatName = "    ";
      const expectedErr = new DynamicError(
        "users array and chatName are required!"
      );
      createGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error if groupImg in not a string", () => {
      request.body.groupImg = 123;
      const expectedErr = new DynamicError(
        "groupImg supposed to be a url string!"
      );
      createGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });

    it("should throw an error if users is not an array", async () => {
      request.body.users = "string";
      const expectedErr = new DynamicError("users must be an array!");
      createGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should throw an error if users array is shorter than 2", async () => {
      request.body.users = [{ user: "user1" }];
      const expectedErr = new DynamicError(
        "Group chat must contain more than 2 users!",
        400
      );
      createGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });

    it("should call next with error when validateUsersArr returns false", async () => {
      validateUsersArr.mockResolvedValueOnce(false);
      const expectedErr = new DynamicError("Invalid users!");
      await createGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when ChatModel.create throws ValidationError", async () => {
      const mongodbErr = generateValidationError(
        "chatName",
        "chatName is missing"
      );
      const expectedErr = DBErrorHandler.handle(mongodbErr);
      (ChatModel.create as jest.Mock).mockRejectedValueOnce(mongodbErr);
      await createGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when ChatModel.create non validationError occured", async () => {
      const err = "mongodbErr";
      const expectedErr = DBErrorHandler.handle(err);
      (ChatModel.create as jest.Mock).mockRejectedValueOnce(err);
      await createGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should respond with groupChat when it was passed all validations", async () => {
      await createGroupChat(request, response, nextFn);
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith(chat);
    });
    it("should create chat even when groupImg was not sent (img url is optional)", async () => {
      request.body.groupImg = null;
      await createGroupChat(request, response, nextFn);
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith(chat);
    });
  });

  describe("deleteGroupChat", () => {
    beforeEach(() => {
      request.params.groupId = "someGroupId";
      (ChatModel.findOneAndDelete as jest.Mock).mockResolvedValue(chat);
    });

    it("should call next with error if ChatModel.findOneAndDelete throws an error", async () => {
      const expectedErr = new DynamicError("Server Error!", 500);
      (ChatModel.findOneAndDelete as jest.Mock).mockRejectedValueOnce("error");
      await deleteGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error if chat was not found", async () => {
      const expectedErr = new DynamicError("Group chat not found!");
      (ChatModel.findOneAndDelete as jest.Mock).mockResolvedValueOnce(null);
      await deleteGroupChat(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should sendStatus 204 if deleted successfuly", async () => {
      await deleteGroupChat(request, response, nextFn);
      expect(response.sendStatus).toHaveBeenCalledWith(204);
      expect(nextFn).not.toHaveBeenCalled();
    });
  });
  describe("renameGroup", () => {
    const updatedChat = { ...chat, chatName: "newName" } as IChatModel;

    beforeEach(() => {
      request.params.groupId = "someGroupId";
      request.body.chatName = "newGroupName";
      (ChatModel.findOneAndUpdate as jest.Mock).mockImplementation(() => {
        const thirdPopulate = {
          populate: jest.fn().mockResolvedValue(updatedChat),
        };
        const secondPopulate = {
          populate: jest.fn().mockReturnValue(thirdPopulate),
        };
        const firstPopulate = {
          populate: jest.fn().mockReturnValue(secondPopulate),
        };
        return firstPopulate;
      });
    });

    it("should call next with error if chatName is nullish", () => {
      const expectedErr = new DynamicError("chatName is required!");
      request.body.chatName = "";
      renameGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error if chatName not a string", () => {
      const expectedErr = new DynamicError("chatName is required!");
      request.body.chatName = 1234;
      renameGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error if chatName can be trimmed to nullish value", () => {
      const expectedErr = new DynamicError("chatName is required!");
      request.body.chatName = "   ";
      renameGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error if ChatModel.findOneAndUpdate throws an error", async () => {
      const expectedErr = new DynamicError("Group chat was not found!", 404);
      (ChatModel.findOneAndUpdate as jest.Mock).mockImplementationOnce(() => {
        const thirdPopulate = {
          populate: jest.fn().mockRejectedValueOnce("someError"),
        };
        const secondPopulate = {
          populate: jest.fn().mockReturnValueOnce(thirdPopulate),
        };
        const firstPopulate = {
          populate: jest.fn().mockReturnValueOnce(secondPopulate),
        };
        return firstPopulate;
      });
      await renameGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should respond with updated chat when successfuly updated", async () => {
      await renameGroup(request, response, nextFn);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(updatedChat);
    });
  });
  describe("addMembersToGroup", () => {
    let validateUsersArr: jest.SpyInstance;
    const updatedChat = { ...chat, users: [mockUser._id, userFound._id] };
    beforeEach(() => {
      validateUsersArr = jest
        .spyOn(dbChecks, "validateUsersArr")
        .mockResolvedValue(true);
      (ChatModel.findOneAndUpdate as jest.Mock).mockImplementation(() => {
        const thirdPopulate = {
          populate: jest.fn().mockResolvedValue(updatedChat),
        };
        const secondPopulate = {
          populate: jest.fn().mockReturnValue(thirdPopulate),
        };
        const firstPopulate = {
          populate: jest.fn().mockReturnValueOnce(secondPopulate),
        };
        return firstPopulate;
      });
      request.params.groupId = "someGroupId";
      request.body.users = [...updatedChat.users];
    });

    it("should call next with error when users is nullish", () => {
      request.body.users = null;
      const expectedErr = new DynamicError("users array was not provided!");
      addMembersToGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when users is not an array", () => {
      request.body.users = {};
      const expectedErr = new DynamicError("users array was not provided!");
      addMembersToGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when users array is empty", () => {
      request.body.users = [];
      const expectedErr = new DynamicError("users array is empty");
      addMembersToGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when users in the array are not valid", async () => {
      validateUsersArr.mockResolvedValueOnce(false);
      const expectedErr = new DynamicError("Invalid users!");
      await addMembersToGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when findOneAndUpdate throws an error", async () => {
      (ChatModel.findOneAndUpdate as jest.Mock).mockImplementation(() => {
        const thirdPopulate = {
          populate: jest.fn().mockRejectedValueOnce("updatedChat error"),
        };
        const secondPopulate = {
          populate: jest.fn().mockReturnValueOnce(thirdPopulate),
        };
        const firstPopulate = {
          populate: jest.fn().mockReturnValueOnce(secondPopulate),
        };
        return firstPopulate;
      });
      const expectedErr = new DynamicError("Group chat was not found!");
      await addMembersToGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should should call next with error when findOneAndUpdate return null", async () => {
      (ChatModel.findOneAndUpdate as jest.Mock).mockImplementation(() => {
        const thirdPopulate = {
          populate: jest.fn().mockReturnValueOnce(null),
        };
        const secondPopulate = {
          populate: jest.fn().mockReturnValueOnce(thirdPopulate),
        };
        const firstPopulate = {
          populate: jest.fn().mockReturnValueOnce(secondPopulate),
        };
        return firstPopulate;
      });
      const expectedErr = new DynamicError(
        "You do not have permission to add members to this group.",
        403
      );
      await addMembersToGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should respond with updatedChat when updated successfuly", async () => {
      await addMembersToGroup(request, response, nextFn);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(updatedChat);
    });
  });
  describe("removeMembersFromGroup", () => {
    beforeEach(() => {
      request.params = { groupId: "someGroupId", userId: "someUserId" };
      const mockMongooseSaveFn = jest.fn().mockImplementation(() => {
        const thirdPopulate = {
          populate: jest.fn().mockResolvedValue(groupChat),
        };
        const secondPopulate = {
          populate: jest.fn().mockResolvedValue(thirdPopulate),
        };
        const firstPopulate = {
          populate: jest.fn().mockResolvedValue(secondPopulate),
        };
        return Promise.resolve(firstPopulate);
      });
      const mockFindByIdResults = { ...groupChat, save: mockMongooseSaveFn };
      (ChatModel.findById as jest.Mock).mockResolvedValue(mockFindByIdResults);
    });
    it("should call next with error when findById throws an error", async () => {
      const expectedErr = new DynamicError("Group chat was not found!", 404);
      (ChatModel.findById as jest.Mock).mockRejectedValueOnce("someError");
      await removeMembersFromGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when findById return null", async () => {
      const expectedErr = new DynamicError("Group chat was not found!", 404);
      (ChatModel.findById as jest.Mock).mockResolvedValueOnce(null);
      await removeMembersFromGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with premission error non admin tries to remove a user", async () => {
      const expectedErr = new DynamicError(
        "You do not have premission to remove this user",
        403
      );
      await removeMembersFromGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when admin tries to remove himself from an active groupChat", async () => {
      request.params.userId = adminId;
      request.user._id = adminId;
      const expectedErr = new DynamicError(
        "Admin cannot be removed from an active chat group!",
        403
      );
      await removeMembersFromGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when user not found in group members", async () => {
      request.user._id = adminId;
      const expectedErr = new DynamicError("User not found!", 404);
      await removeMembersFromGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when mongoose save function throws an error", async () => {
      request.params.userId = mockUser._id;
      request.user._id = mockUser._id;
      (ChatModel.findById as jest.Mock).mockImplementationOnce(() => {
        const save = jest.fn().mockRejectedValueOnce("error");
        return Promise.resolve({ ...groupChat, save });
      });
      const expectedErr = new DynamicError("Server Error!", 500);
      await removeMembersFromGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should respond 204 when user (non admin) leaves groupChat successfuly", async () => {
      request.params.userId = mockUser._id;
      request.user._id = mockUser._id;
      await removeMembersFromGroup(request, response, nextFn);
      expect(response.sendStatus).toHaveBeenCalledWith(204);
    });
    it("should call next with error when admin removes a user and populate function throws an error", async () => {
      request.params.userId = mockUser._id;
      request.user._id = adminId;
      (ChatModel.findById as jest.Mock).mockImplementationOnce(() => {
        const thirdPopulate = {
          populate: jest.fn().mockRejectedValueOnce("someError"),
        };
        const secondPopulate = {
          populate: jest.fn().mockResolvedValueOnce(thirdPopulate),
        };
        const firstPopulate = {
          populate: jest.fn().mockResolvedValueOnce(secondPopulate),
        };
        const save = jest
          .fn()
          .mockImplementationOnce(() => Promise.resolve(firstPopulate));
        return Promise.resolve({ ...groupChat, save });
      });
      const expectedErr = new DynamicError("Server Error!", 500);
      await removeMembersFromGroup(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should respond with groupChat when admin successfuly removes a member", async () => {
      request.params.userId = mockUser._id;
      request.user._id = adminId;
      await removeMembersFromGroup(request, response, nextFn);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(groupChat);
    });
  });
});
