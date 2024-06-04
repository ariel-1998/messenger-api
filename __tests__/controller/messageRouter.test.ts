import "../controllerSetup";
import app from "../../src/app";
import request from "supertest";
import { IUserModel, UserModel } from "../../src/models/UserModel";
import { createJWT } from "../../src/utils/createJWT";
import { SendMessageBody } from "../../src/logic/messageLogic";
import { ChatModel, IChatModel } from "../../src/models/ChatModel";
import mongoose from "mongoose";
import { IMessageModel, MessageModel } from "../../src/models/MessageModel";

let authedUserJwt = "Bearer ";
const baseUrl = "/api/message";

const authedUser: User = {
  name: "ariel",
  email: "test@emample.com",
  password: "somePassword",
};
const secondUser: User = {
  name: "user2",
  email: "test2@emample.com",
  password: "somePassword2",
};
const thirdUser: User = {
  name: "user3",
  email: "test3@emample.com",
  password: "somePassword3",
};
let createdUser1: IUserModel;
let createdUser2: IUserModel;
let createdUser3: IUserModel;
let chat: IChatModel;

beforeAll(async () => {
  const users = await UserModel.create([
    { ...authedUser },
    { ...secondUser },
    { ...thirdUser },
  ]);
  createdUser1 = users[0];
  createdUser2 = users[1];
  createdUser3 = users[2];
  authedUserJwt += createJWT(users[0]);

  const newGroupChat = new ChatModel({
    chatName: "null",
    isGroupChat: true,
    users: [createdUser1._id, createdUser2._id],
  });

  chat = await ChatModel.create(newGroupChat);
});

describe("messageRouter", () => {
  describe("sendMessage", () => {
    let body: SendMessageBody;
    beforeAll(() => {
      body = {
        chat: chat._id,
        content: "message",
        frontendTimeStamp: new Date(),
      };
    });
    afterEach(async () => {
      const collections = mongoose.connection.collections;
      const messgaeCollection = collections["messages"];
      if (messgaeCollection) await messgaeCollection.deleteMany();
    });
    it("should respond with an error when user is not authed", async () => {
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", "unAutheedToken")
        .send({ ...body });
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should respond with an error when content is nullish", async () => {
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ ...body, content: "" });
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "Content or chat are invalid",
      });
    });
    it("should respond with an error when content can be trimmed to nullish", async () => {
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ ...body, content: "    " });
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "Content or chat are invalid",
      });
    });
    it("should respond with an error when chatId is nullish", async () => {
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ ...body, chat: "" });
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "Content or chat are invalid",
      });
    });
    it("should respond with an error when chat was not found", async () => {
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ ...body, chat: new mongoose.Types.ObjectId() });
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({
        message: "Chat was not found",
      });
    });
    it("should respond with an error when user is not part of the chat", async () => {
      const userNotInChat = createJWT(createdUser3);
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", `Bearer ${userNotInChat}`)
        .send({ ...body });
      expect(response.status).toBe(403);
      expect(response.body).toStrictEqual({
        message: "Cannot send message to a chat you are not part of",
      });
    });
    it("should respond message when was successfuly sent", async () => {
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ ...body });
      const res: Omit<IMessageModel, "chat"> & { chat: IChatModel } =
        response.body;
      expect(response.status).toBe(200);
      expect(res._id).toBeDefined();
      expect(res.chat._id.toString()).toBe(chat._id.toString());
    });
  });
  describe("getAllMessagesByChatId", () => {
    let path = "";
    beforeAll(async () => {
      const newMsg1 = new MessageModel({
        content: "someContent",
        chat: chat._id,
        sender: createdUser1._id,
        readBy: [],
        frontendTimeStamp: new Date(),
      });
      const newMsg2 = new MessageModel({
        content: "someContent",
        chat: chat._id,
        sender: createdUser1._id,
        readBy: [],
        frontendTimeStamp: new Date(),
      });
      await MessageModel.create([newMsg1, newMsg2]);
      path = `${baseUrl}/chat/${chat._id}`;
    });
    afterAll(async () => {
      const collections = mongoose.connection.collections;
      const messageCollection = collections["messages"];
      if (messageCollection) await messageCollection.deleteMany();
    });
    it("should respond with an error when user is not authed", async () => {
      const response = await request(app)
        .get(path)
        .set("Authorization", "unAutheedToken");
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should responsd with an error when chat was not found", async () => {
      const response = await request(app)
        .get(`${baseUrl}/chat/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({
        message: "Chat was not found",
      });
    });
    it("should responsd with an error when user is not part of the chat", async () => {
      const UserNotInChatJwt = createJWT(createdUser3);
      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${UserNotInChatJwt}`);
      expect(response.status).toBe(403);
      expect(response.body).toStrictEqual({
        message: "Cannot recive messages from a chat that you are not part of.",
      });
    });
    it("should respond with messages", async () => {
      const response = await request(app)
        .get(path)
        .set("Authorization", authedUserJwt);
      const res: IMessageModel[] = response.body;
      expect(response.status).toBe(200);
      expect(res.length).toBe(2);
    });
  });
  describe("getAllUnreadMessages", () => {
    const path = `${baseUrl}/unread`;
    beforeAll(async () => {
      const newMsg1 = new MessageModel({
        content: "someContent",
        chat: chat._id,
        sender: createdUser2._id,
        readBy: [],
        frontendTimeStamp: new Date(),
      });
      const newMsg2 = new MessageModel({
        content: "someContent",
        chat: chat._id,
        sender: createdUser2._id,
        readBy: [],
        frontendTimeStamp: new Date(),
      });
      await MessageModel.create([newMsg1, newMsg2]);
    });
    afterAll(async () => {
      const collections = mongoose.connection.collections;
      const messageCollection = collections["messages"];
      if (messageCollection) await messageCollection.deleteMany();
    });
    it("should respond with an error when user is not authed", async () => {
      const response = await request(app)
        .get(path)
        .set("Authorization", "unAutheedToken");
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should respond with an error when chats are not found", async () => {
      const userWithNoChats = await UserModel.create({
        name: "user4",
        email: "test4@emample.com",
        password: "somePassword4",
      });
      const jwt = createJWT(userWithNoChats);
      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${jwt}`);
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({
        message: "Chats were not found",
      });
      //remove user so the DB will stay the same for the rest of the tests
      await UserModel.findByIdAndDelete(userWithNoChats._id);
    });

    it("should return messages array", async () => {
      const response = await request(app)
        .get(path)
        .set("Authorization", authedUserJwt);
      const messages: IMessageModel[] = response.body;
      expect(response.status).toBe(200);
      expect(messages.length).toBe(2);
    });
  });
  describe("updateReadBy", () => {
    let body: {
      chatId: unknown;
    };
    let message1: IMessageModel;
    let message2: IMessageModel;

    beforeAll(async () => {
      const newMsg1 = new MessageModel({
        content: "someContent",
        chat: chat._id,
        sender: createdUser2._id,
        readBy: [],
        frontendTimeStamp: new Date(),
      });
      const newMsg2 = new MessageModel({
        content: "someContent",
        chat: chat._id,
        sender: createdUser2._id,
        readBy: [],
        frontendTimeStamp: new Date(),
      });
      const messages = await MessageModel.create([newMsg1, newMsg2]);
      message1 = messages[0];
      message2 = messages[1];
      body = { chatId: chat._id };
    });
    afterAll(async () => {
      const collections = mongoose.connection.collections;
      const messageCollection = collections["messages"];
      if (messageCollection) await messageCollection.deleteMany();
    });

    it("should respond with an error when user is not authed", async () => {
      const response = await request(app)
        .put(baseUrl)
        .set("Authorization", "unAutheedToken")
        .send({ ...body });
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should respond with an error when chatId is nullish", async () => {
      const response = await request(app)
        .put(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ ...body, chatId: "" });
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "chatId was not provided!",
      });
    });
    it("should respond with an error when chatId can be trimmed to nullish value", async () => {
      const response = await request(app)
        .put(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ ...body, chatId: "  " });
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "chatId was not provided!",
      });
    });

    it("should respond with an error when chat was not found", async () => {
      const response = await request(app)
        .put(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ ...body, chatId: new mongoose.Types.ObjectId() });
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({
        message: "Chat was not found",
      });
    });
    it("should respond with an error when user does not exist in chat", async () => {
      const userNotInChat = await UserModel.create({
        name: "user4",
        email: "test4@emample.com",
        password: "somePassword4",
      });
      const userJwt = createJWT(userNotInChat);
      const response = await request(app)
        .put(baseUrl)
        .set("Authorization", `Bearer ${userJwt}`)
        .send({ ...body });
      expect(response.status).toBe(403);
      expect(response.body).toStrictEqual({
        message: "User is not part of this chat!",
      });
      //remove the user after the test so DB will stay the same in all tests
      await UserModel.findByIdAndDelete(userNotInChat._id);
    });
    it("should read messages", async () => {
      const response = await request(app)
        .put(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ ...body });
      const res: IChatModel = response.body;
      expect(res._id).toBeDefined();
      expect(res._id.toString()).toBe(chat._id.toString());
      expect(response.status).toBe(200);
    });
  });
});

type User = Pick<IUserModel, "name" | "password" | "email">;
