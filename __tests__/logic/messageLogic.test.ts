import { NextFunction, Request, Response } from "express";
import {
  SendMessageBody,
  getAllMessagesByChatId,
  getAllUnreadMessages,
  sendMessage,
  updateReadBy,
} from "../../src/logic/messageLogic";
import { IUserModel } from "../../src/models/UserModel";
import {
  createMockMiddlewareParams,
  generateValidationError,
} from "../testUtils";
import { CustomReq } from "../../src/models/CustomReq";
import { DynamicError } from "../../src/models/ErrorModel";
import { ChatModel, IChatModel } from "../../src/models/ChatModel";
import { IMessageModel, MessageModel } from "../../src/models/MessageModel";
import mongoose, { ObjectId } from "mongoose";

jest.mock("../../src/models/ChatModel");
jest.mock("../../src/models/MessageModel");

const mockUser = {
  _id: "reqUserId",
  name: "name",
  email: "email@gmail.com",
  image: "someUrl",
} as IUserModel;
const mockReciverId = "reciverId";
const chat = {
  _id: "chatId",
  chatName: "null",
  isGroupChat: false,
  users: [mockReciverId, mockUser._id],
  latestMessage: "" as unknown as ObjectId,
  groupAdmin: "" as unknown as ObjectId,
  groupImg: "",
} as IChatModel;
const message: IMessageModel = {
  _id: "someId" as unknown as ObjectId,
  sender: mockUser as unknown as ObjectId,
  content: "someContent",
  chat: chat as unknown as ObjectId,
  readBy: [] as mongoose.Schema.Types.ObjectId[],
} as IMessageModel;

describe("messageLogic", () => {
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
  describe("sendMessage", () => {
    const body: SendMessageBody = {
      chat: "chatId",
      content: "message",
    };
    beforeEach(() => {
      request.body = { ...body };
      (ChatModel.findById as jest.Mock).mockResolvedValue(chat);

      (MessageModel.create as jest.Mock).mockImplementation(() => {
        const secondPopulate = {
          ...message,
          populate: jest.fn().mockReturnValueOnce(message),
        };
        const firstPopulate = {
          ...message,
          populate: jest.fn().mockReturnValueOnce(secondPopulate),
        };
        return Promise.resolve(firstPopulate);
      });

      (ChatModel.findByIdAndUpdate as jest.Mock).mockImplementation(() => {
        const mockedChat = { session: jest.fn().mockResolvedValue(null) };
        return mockedChat;
      });
    });

    it("should respond status code 400 when content is nullish", () => {
      request.body.content = null;
      const expectedErr = new DynamicError("Content or chat are invalid", 400);
      sendMessage(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should respond status code 400 when chatId is nullish", () => {
      request.body.chat = null;
      const expectedErr = new DynamicError("Content or chat are invalid", 400);
      sendMessage(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when ChatModel.findById throws an error", async () => {
      const expectedErr = new DynamicError("An unknown error occurred!", 500);
      (ChatModel.findById as jest.Mock).mockRejectedValueOnce("error");
      await sendMessage(request, response, nextFn);
      expect(ChatModel.findById).toHaveBeenCalledWith(request.body.chat);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when ChatModel.findById returns null", async () => {
      const expectedErr = new DynamicError("Chat was not found", 404);
      (ChatModel.findById as jest.Mock).mockResolvedValueOnce(null);
      await sendMessage(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when sender is not part of the group", async () => {
      const expectedErr = new DynamicError(
        "Cannot send message to a chat you are not part of",
        403
      );
      const users = [mockReciverId, "anotherMockReciverId"];
      (ChatModel.findById as jest.Mock).mockResolvedValueOnce({
        ...chat,
        users,
      });
      await sendMessage(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });

    it("should call next with error when MessageModel.create throws an error", async () => {
      const expectedErr = new DynamicError("An unknown error occurred!", 500);
      (MessageModel.create as jest.Mock).mockRejectedValueOnce("error");
      await sendMessage(request, response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with mongoose schema error when MessageModel.create validation fails", async () => {
      request.body.chat = 123;
      const err = generateValidationError("chat", "Invalid users were sent!");
      const expectedErr = {
        message: "An unknown error occurred!",
        status: 500,
      };
      (MessageModel.create as jest.Mock).mockRejectedValueOnce(err);
      await sendMessage(request, response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should throw an error when sender populate throws an error", async () => {
      const expectedErr = new DynamicError("An unknown error occurred!", 500);
      (MessageModel.create as jest.Mock).mockResolvedValueOnce({
        message,
        populate: jest.fn().mockRejectedValueOnce("error"),
      });
      await sendMessage(request, response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should throw an error when chat or users populate throws an error", async () => {
      const expectedErr = new DynamicError("An unknown error occurred!", 500);

      (MessageModel.create as jest.Mock).mockImplementationOnce(() => {
        const chatAndUserPopulate = {
          populate: jest.fn().mockRejectedValueOnce("error"),
        };
        const senderPopulate = jest
          .fn()
          .mockResolvedValueOnce(chatAndUserPopulate);
        return Promise.resolve({
          ...message,
          populate: senderPopulate,
        });
      });
      await sendMessage(request, response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should respond with messaage even when ChatModel.findByIdAndUpdate throws an error", async () => {
      const expectedErr = new DynamicError("An unknown error occurred!", 500);
      (ChatModel.findByIdAndUpdate as jest.Mock).mockRejectedValueOnce(
        "someError"
      );
      await sendMessage(request, response, nextFn);

      expect(nextFn).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(message);
    });
    it("should respond with message when message was created", async () => {
      await sendMessage(request, response, nextFn);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(message);
    });
  });
  describe("getAllMessagesByChatId", () => {
    beforeEach(() => {
      request.params.chatId = chat._id;
      (ChatModel.findById as jest.Mock).mockResolvedValue(chat);
      (MessageModel.find as jest.Mock).mockImplementation(() => {
        const seconsdPopulate = jest.fn().mockResolvedValue(message);
        const firstPopulate = jest
          .fn()
          .mockReturnValue({ populate: seconsdPopulate });
        return { populate: firstPopulate };
      });
    });
    it("should call next with error when ChatModel.findById throws an error", async () => {
      const expectedErr = new DynamicError("Server Error!", 500);
      (ChatModel.findById as jest.Mock).mockRejectedValueOnce("someError");
      await getAllMessagesByChatId(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when chat was not found", async () => {
      const expectedErr = new DynamicError("Chat was not found", 404);
      (ChatModel.findById as jest.Mock).mockResolvedValueOnce(null);
      await getAllMessagesByChatId(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when user is not part of the requested chat", async () => {
      const expectedErr = new DynamicError(
        "Cannot recive messages from a chat that you are not part of.",
        403
      );
      (ChatModel.findById as jest.Mock).mockResolvedValueOnce({
        ...chat,
        users: ["randomId1", "randomId2"],
      });
      await getAllMessagesByChatId(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should return next with error when MessageModel.find throws an erroe", async () => {
      const expectedErr = new DynamicError("Server Error!", 500);
      (MessageModel.find as jest.Mock).mockImplementationOnce(() => {
        const seconsdPopulate = jest.fn().mockRejectedValueOnce("someError");
        const firstPopulate = jest
          .fn()
          .mockReturnValueOnce({ populate: seconsdPopulate });
        return { populate: firstPopulate };
      });
      await getAllMessagesByChatId(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should rspond with message when succeed validation", async () => {
      await getAllMessagesByChatId(request, response, nextFn);
      expect(nextFn).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(message);
    });
  });
  describe("getAllUnreadMessages", () => {
    const messages = [message];
    beforeEach(() => {
      (MessageModel.find as jest.Mock).mockImplementation(() => {
        const secondPopulate = jest.fn().mockResolvedValue(messages);
        const firstPopulate = jest
          .fn()
          .mockReturnValue({ populate: secondPopulate });
        return { populate: firstPopulate };
      });
      (ChatModel.find as jest.Mock).mockResolvedValue([chat]);
    });
    it("should call next with error when ChatModel.find throws an error", async () => {
      (ChatModel.find as jest.Mock).mockRejectedValueOnce("someError");
      const expectedErr = new DynamicError("Server Error!", 500);
      await getAllUnreadMessages(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when ChatModel.find return an empty array", async () => {
      (ChatModel.find as jest.Mock).mockResolvedValueOnce([]);
      const expectedErr = new DynamicError("Chats were not found", 404);
      await getAllUnreadMessages(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when MessageModel.find throws an error", async () => {
      const expectedErr = new DynamicError("Server Error!", 500);
      (MessageModel.find as jest.Mock).mockImplementationOnce(() => {
        const secondPopulate = jest.fn().mockRejectedValueOnce("someError");
        const firstPopulate = jest
          .fn()
          .mockReturnValueOnce({ populate: secondPopulate });
        return { populate: firstPopulate };
      });
      await getAllUnreadMessages(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should return messages array if messages returned", async () => {
      await getAllUnreadMessages(request, response, nextFn);
      expect(nextFn).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(messages);
    });
    it("should return messages array even ifan empty messages array returned", async () => {
      (MessageModel.find as jest.Mock).mockImplementationOnce(() => {
        const secondPopulate = jest.fn().mockResolvedValueOnce([]);
        const firstPopulate = jest
          .fn()
          .mockReturnValueOnce({ populate: secondPopulate });
        return { populate: firstPopulate };
      });
      await getAllUnreadMessages(request, response, nextFn);
      expect(nextFn).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith([]);
    });
  });
  describe("updateReadBy", () => {
    const messages = ["messageId1", "messageId2"];
    const body = { messages, chatId: chat._id };
    beforeEach(() => {
      request.body = { ...body };
      (ChatModel.findById as jest.Mock).mockImplementation(() => {
        const populate = jest.fn().mockResolvedValue(chat);
        return Promise.resolve({ ...chat, populate });
      });
    });
    it("should call next with error when chatId is nullish", () => {
      request.body.chatId = null;
      const expectedErr = new DynamicError("chatId was not provided!");
      updateReadBy(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when chatId is a number", () => {
      request.body.chatId = 123;
      const expectedErr = new DynamicError("chatId was not provided!");
      updateReadBy(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when chatId can be trimmed to nullish value", () => {
      request.body.chatId = "   ";
      const expectedErr = new DynamicError("chatId was not provided!");
      updateReadBy(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when ChatModel.findById throws an error", async () => {
      const expectedErr = new DynamicError("Server Error!", 500);
      (ChatModel.findById as jest.Mock).mockRejectedValueOnce("someError");
      await updateReadBy(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error chat was not found", async () => {
      const expectedErr = new DynamicError("Chat was not found", 404);
      (ChatModel.findById as jest.Mock).mockResolvedValueOnce(null);
      await updateReadBy(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when user is part of the chat", async () => {
      const expectedErr = new DynamicError(
        "User is not part of this chat!",
        403
      );
      request.user._id = "randomId";
      await updateReadBy(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when MessageModel.updateMany throws an error", async () => {
      const expectedErr = new DynamicError("Server Error!", 500);
      (MessageModel.updateMany as jest.Mock).mockRejectedValueOnce("someError");
      await updateReadBy(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should call next with error when chat.populate throws an error", async () => {
      const expectedErr = new DynamicError("Server Error!", 500);
      (ChatModel.findById as jest.Mock).mockImplementationOnce(() => {
        const populate = jest.fn().mockRejectedValueOnce("someError");
        return Promise.resolve({ ...chat, populate });
      });
      await updateReadBy(request, response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn).toHaveBeenCalledWith(expectedErr);
    });
    it("should respond with populated chat when goes well", async () => {
      await updateReadBy(request, response, nextFn);
      expect(nextFn).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(chat);
    });
  });
});
