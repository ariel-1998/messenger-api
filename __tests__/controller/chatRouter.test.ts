import "../controllerSetup";
import app from "../../src/app";
import { IUserModel, UserModel } from "../../src/models/UserModel";
import request from "supertest";
import { createJWT } from "../../src/utils/createJWT";
import mongoose from "mongoose";
import { ChatModel, IChatModel } from "../../src/models/ChatModel";

let authedUserJwt = "Bearer ";
const baseUrl = "/api/chat";

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
});

describe("chatRouter", () => {
  describe("accessChat", () => {
    let body: { userId: string };

    beforeEach(() => {
      body = { userId: createdUser2._id };
    });
    afterAll(async () => {
      const collections = mongoose.connection.collections;
      const chatCollection = collections["chats"];
      if (chatCollection) await chatCollection.deleteMany();
    });

    it("should respond with an error when unAuthed", async () => {
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", "invalidToken")
        .send({ ...body });
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should respond with an error when userId was not sent in body", async () => {
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "userId wasn't sent in the body",
      });
    });
    it("should respond with an error when user was not found from userId", async () => {
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ userId: new mongoose.Types.ObjectId() });
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({
        message: "User does not exist!",
      });
    });
    it("should respond with chat if already exist", async () => {
      const newChat = new ChatModel({
        chatName: "null",
        isGroupChat: false,
        users: [createdUser1._id, createdUser3._id],
      });
      const chat = await ChatModel.create(newChat);
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ userId: createdUser3._id });
      expect(response.status).toBe(200);
      expect(response.body._id).toEqual(chat._id.toString());
    });
    it("should create new Chat when does not exist", async () => {
      const response = await request(app)
        .post(baseUrl)
        .set("Authorization", authedUserJwt)
        .send({ ...body });
      expect(response.status).toBe(200);
      expect(response.body.users.length).toBe(2);
    });
  });

  describe("getAllChats", () => {
    beforeAll(async () => {
      const newChatData = new ChatModel({
        chatName: "null",
        isGroupChat: false,
        users: [createdUser1._id, createdUser2._id],
      });

      const newGroupChatData1 = new ChatModel({
        chatName: "null",
        isGroupChat: true,
        users: [createdUser1._id, createdUser3._id],
      });
      const newGroupChatData2 = new ChatModel({
        chatName: "null",
        isGroupChat: true,
        users: [createdUser1._id, createdUser3._id],
      });
      await ChatModel.create([
        newChatData,
        newGroupChatData1,
        newGroupChatData2,
      ]);
    });
    afterAll(async () => {
      const collections = mongoose.connection.collections;
      const chatCollection = collections["chats"];
      if (chatCollection) await chatCollection.deleteMany();
    });
    it("should fail when user is unAuthed", async () => {
      const response = await request(app)
        .get(baseUrl)
        .set("Authorization", "unAutheedToken");
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should return all chats with users only if groupChat or if not a group chat but first message was already send", async () => {
      const response = await request(app)
        .get(baseUrl)
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });
  });

  describe("createGroupChat", () => {
    const path = `${baseUrl}/group`;
    let body: { users: string[]; chatName: string; groupImg?: string };
    beforeEach(() => {
      body = {
        users: [createdUser2._id, createdUser3._id],
        chatName: "anyName",
        groupImg: "anyUrl",
      };
    });
    it("should respond with an error when user is unAuthed", async () => {
      const response = await request(app)
        .post(path)
        .send({ ...body })
        .set("Authorization", "unAuthedToken");
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should respond with an error when users is not defined", async () => {
      const response = await request(app)
        .post(path)
        .send({ ...body, users: null })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "users array and chatName are required!",
      });
    });
    it("should respond with an error when chatName is not defined", async () => {
      const response = await request(app)
        .post(path)
        .send({ ...body, chatName: null })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "users array and chatName are required!",
      });
    });
    it("should respond with an error when chatName can be trimmed to null", async () => {
      const response = await request(app)
        .post(path)
        .send({ ...body, chatName: "   " })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "users array and chatName are required!",
      });
    });
    it("should respond with an error when users is not an array", async () => {
      const response = await request(app)
        .post(path)
        .send({ ...body, users: "   " })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "users must be an array!",
      });
    });
    it("should respond with an error when users has less then 2 items", async () => {
      const response = await request(app)
        .post(path)
        .send({ ...body, users: [createdUser2._id] })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "Group chat must contain more than 2 users!",
      });
    });
    it("should respond with an error when groupImg is not a string", async () => {
      const response = await request(app)
        .post(path)
        .send({ ...body, groupImg: 123 })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "groupImg supposed to be a url string!",
      });
    });
    it("should return error when users arr has user that does not exist", async () => {
      const response = await request(app)
        .post(path)
        .send({
          ...body,
          users: [...body.users, new mongoose.Types.ObjectId()],
        })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "Invalid users!",
      });
    });
    it("should create new chat", async () => {
      const response = await request(app)
        .post(path)
        .send({
          ...body,
        })
        .set("Authorization", authedUserJwt);
      const users = response.body.users;
      expect(response.status).toBe(201);
      expect(users.length).toBe(3);
    });
  });
  describe("deleteGroupChat", () => {
    let chat: IChatModel;
    let path = `${baseUrl}/group/`;

    afterAll(async () => {
      const collections = mongoose.connection.collections;
      const chatCollection = collections["chats"];
      if (chatCollection) await chatCollection.deleteMany();
    });
    beforeAll(async () => {
      const newGroupChat = new ChatModel({
        chatName: "null",
        isGroupChat: true,
        groupAdmin: createdUser1._id,
        users: [createdUser2._id, createdUser3._id, createdUser1._id],
      });
      chat = await ChatModel.create(newGroupChat);
      path += chat._id;
    });
    it("should respond with an error when user is unAuthed", async () => {
      const response = await request(app)
        .delete(path)
        .set("Authorization", "unAuthedToken");
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should respond with error when chat does not exist", async () => {
      const response = await request(app)
        .delete(`${baseUrl}/group/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "Group chat not found!",
      });
    });
    it("should respond with error when user requesting to delete is not groupAdmin", async () => {
      const notAdminJwt = createJWT(createdUser2);
      const response = await request(app)
        .delete(path)
        .set("Authorization", `Bearer ${notAdminJwt}`);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "Group chat not found!",
      });
    });
    it("should delete chat successfully", async () => {
      const response = await request(app)
        .delete(path)
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(204);
    });
  });
  describe("renameGroup", () => {
    let chat: IChatModel;
    let path = `${baseUrl}/group/`;
    let body: { chatName: string };

    afterAll(async () => {
      const collections = mongoose.connection.collections;
      const chatCollection = collections["chats"];
      if (chatCollection) await chatCollection.deleteMany();
    });
    beforeAll(async () => {
      const newGroupChat = new ChatModel({
        chatName: "newChat",
        isGroupChat: true,
        groupAdmin: createdUser1._id,
        users: [createdUser2._id, createdUser3._id, createdUser1._id],
      });
      chat = await ChatModel.create(newGroupChat);
      path += `${chat._id}/rename`;
      body = { chatName: "someDifferentName" };
    });
    it("should respond with an error when user is unAuthed", async () => {
      const response = await request(app)
        .put(path)
        .send({ ...body })
        .set("Authorization", "unAuthedToken");
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should respond with an error when chatName is nullish", async () => {
      const response = await request(app)
        .put(path)
        .send({ ...body, chatName: "" })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "chatName is required!",
      });
    });
    it("should respond with an error when chatName can be trimmed to null", async () => {
      const response = await request(app)
        .put(path)
        .send({ ...body, chatName: "   " })
        .set("Authorization", authedUserJwt);
      expect(response.body).toStrictEqual({
        message: "chatName is required!",
      });
      expect(response.status).toBe(400);
    });
    it("should respond with updatedChat whemn chat is updated successfuly", async () => {
      const response = await request(app)
        .put(path)
        .send({ ...body })
        .set("Authorization", authedUserJwt);
      const res: IChatModel = response.body;
      expect(response.status).toBe(200);
      expect(res._id.toString()).toBe(chat._id.toString());
      expect(res.chatName).toBe(chat.chatName);
    });
  });
  describe("addMembersToGroup", () => {
    let chat: IChatModel;
    let path = `${baseUrl}/group/`;
    let body: { users: string[] };

    afterAll(async () => {
      const collections = mongoose.connection.collections;
      const chatCollection = collections["chats"];
      if (chatCollection) await chatCollection.deleteMany();
    });
    beforeAll(async () => {
      const newGroupChat = new ChatModel({
        chatName: "newChat",
        isGroupChat: true,
        groupAdmin: createdUser1._id,
        users: [createdUser1._id],
      });
      chat = await ChatModel.create(newGroupChat);
      path += `${chat._id}/members`;
      body = { users: [createdUser2._id, createdUser3._id] };
    });
    it("should respond with an error when user is unAuthed", async () => {
      const response = await request(app)
        .put(path)
        .send({ ...body })
        .set("Authorization", "unAuthedToken");
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should respond with an error when users is nullish", async () => {
      const response = await request(app)
        .put(path)
        .send({ ...body, users: null })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "users array was not provided!",
      });
    });
    it("should respond with an error when users is not an array", async () => {
      const response = await request(app)
        .put(path)
        .send({ ...body, users: {} })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: "users array was not provided!",
      });
    });
    it("should respond with an error when users array is empty", async () => {
      const response = await request(app)
        .put(path)
        .send({ ...body, users: [] })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({ message: "users array is empty" });
    });
    it("should respond with an error when users are invalid", async () => {
      const response = await request(app)
        .put(path)
        .send({ ...body, users: [new mongoose.Types.ObjectId()] })
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({ message: "Invalid users!" });
    });
    it("should respond with an error whengroup wasn't updated (when the user requesting is not a groupAdmin)", async () => {
      const userJwt = createJWT(createdUser2);
      const response = await request(app)
        .put(path)
        .send({ ...body })
        .set("Authorization", `Bearer ${userJwt}`);
      expect(response.status).toBe(403);
      expect(response.body).toStrictEqual({
        message: "You do not have permission to add members to this group.",
      });
    });
    it("should update group successfuly", async () => {
      const response = await request(app)
        .put(path)
        .send({ ...body })
        .set("Authorization", authedUserJwt);
      const res: IChatModel = response.body;
      expect(response.status).toBe(200);
      expect(res._id.toString()).toBe(chat._id.toString());
      expect(res.users.length).toBe(3);
    });
  });
  describe("removeMembersFromGroup", () => {
    let chat: IChatModel;
    let path = `${baseUrl}/group/`;

    afterAll(async () => {
      const collections = mongoose.connection.collections;
      const chatCollection = collections["chats"];
      if (chatCollection) await chatCollection.deleteMany();
    });
    beforeAll(async () => {
      const newGroupChat = new ChatModel({
        chatName: "newChat",
        isGroupChat: true,
        groupAdmin: createdUser1._id,
        users: [createdUser1._id, createdUser2._id, createdUser3._id],
      });
      chat = await ChatModel.create(newGroupChat);
      path += `${chat._id}/members/${createdUser2._id}`;
    });
    it("should respond with an error when user is unAuthed", async () => {
      const response = await request(app)
        .put(path)
        .set("Authorization", "unAuthedToken");
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should respond with an error if group chat was not found", async () => {
      const response = await request(app)
        .put(`${baseUrl}/group/someId/members/${createdUser2._id}`)
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({
        message: "Group chat was not found!",
      });
    });
    it("should respond with an error user role tries to delete other users", async () => {
      const userJwt = createJWT(createdUser3);
      const response = await request(app)
        .put(path)
        .set("Authorization", `Bearer ${userJwt}`);
      expect(response.status).toBe(403);
      expect(response.body).toStrictEqual({
        message: "You do not have premission to remove this user",
      });
    });
    it("should respond with an error when admin tries to remove himself from group", async () => {
      const response = await request(app)
        .put(`${baseUrl}/group/${chat._id}/members/${createdUser1._id}`)
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(403);
      expect(response.body).toStrictEqual({
        message: "Admin cannot be removed from an active chat group!",
      });
    });
    it("should respond with an error when admin tries to remove user thats not found", async () => {
      const response = await request(app)
        .put(
          `${baseUrl}/group/${
            chat._id
          }/members/${new mongoose.Types.ObjectId()}`
        )
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({
        message: "User not found!",
      });
    });
    it("should respond with status 404 when user left the group successfuly", async () => {
      const userJwt = createJWT(createdUser2);
      const response = await request(app)
        .put(path)
        .set("Authorization", `Bearer ${userJwt}`);
      expect(response.status).toBe(204);
      //restore the user to the database to not change the mock data (database)
      await ChatModel.findByIdAndUpdate(chat._id, {
        $addToSet: { users: createdUser2._id },
      });
    });
    it("should delete user from group when admin removes a user successfuly", async () => {
      const response = await request(app)
        .put(path)
        .set("Authorization", authedUserJwt);
      const res: IChatModel = response.body;
      expect(response.status).toBe(200);
      expect(res._id.toString()).toBe(chat._id.toString());
      expect(res.users.length).toBe(chat.users.length - 1);
    });
  });
});

type User = Pick<IUserModel, "name" | "password" | "email">;
