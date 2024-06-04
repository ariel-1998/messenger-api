import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../src/app";
import { IUserModel, UserModel } from "../../src/models/UserModel";
import request from "supertest";
import { createJWT } from "../../src/utils/createJWT";
import "../controllerSetup";

const baseUrl = "/api/user";

const authedUser: User = {
  name: "ariel",
  email: "test@emample.com",
  password: "somePassword",
};
describe("userController", () => {
  describe("searchUser", () => {
    let authedUserJwt = "Bearer ";
    const searchedUser1: User = {
      name: "searchedUser1",
      email: "searchedUser1@emample.com",
      password: "searchedUser1",
    };
    const searchedUser2: User = {
      name: "searchedUser2",
      email: "searchedUser2@emample.com",
      password: "searchedUser2",
    };
    beforeAll(async () => {
      const users = await UserModel.create([
        { ...authedUser },
        { ...searchedUser1 },
        { ...searchedUser2 },
      ]);
      authedUserJwt += createJWT(users[0]);
    });
    it("should throw an error when user is unAuthed", async () => {
      const response = await request(app)
        .get(baseUrl)
        .set("Authorization", "invalidToken")
        .query({ search: "anySearch" });
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "You are not signed in!",
      });
    });
    it("should repond with an error when search was not sent", async () => {
      const response = await request(app)
        .get(baseUrl)
        .set("Authorization", authedUserJwt);
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({
        message: "Not Found!",
      });
    });
    it("should respond 404 when no users were found", async () => {
      const response = await request(app)
        .get(baseUrl)
        .set("Authorization", authedUserJwt)
        .query({ search: "anySearch" });
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({});
    });
    it("should respond 200 with 2 users when there are 2 matches", async () => {
      const response = await request(app)
        .get(baseUrl)
        .set("Authorization", authedUserJwt)
        .query({ search: "searched" });
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });
    it("should exlude the user searching from the results", async () => {
      const response = await request(app)
        .get(baseUrl)
        .set("Authorization", authedUserJwt)
        .query({ search: "@" });
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });
  });
});

type User = Pick<IUserModel, "name" | "password" | "email">;
