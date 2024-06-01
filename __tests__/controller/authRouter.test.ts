import request from "supertest";
import app from "../../src/app";
import { IUserModel, UserModel } from "../../src/models/UserModel";
import "../controllerSetup";
import { CredentialsModel } from "../../src/models/CredentialsModel";

const baseUrl = "/api/auth";
describe("authController", () => {
  describe("registration", () => {
    const path = `${baseUrl}/register`;
    const body = {
      name: "someName",
      email: "test@example.com",
      password: "somePassword",
      image: "somUrl",
    } as IUserModel;

    it("should register a new user when all fields are valid", async () => {
      const response = await request(app)
        .post(path)
        .send({ ...body });
      const user = await UserModel.findOne({ email: body.email });
      expect(response.status).toBe(201);
      expect(response.body).toStrictEqual(expect.any(String));
      expect(user).toBeDefined();
    });
    it("should register a new user when all fields are valid even when image is not sent", async () => {
      const response = await request(app)
        .post(path)
        .send({ ...body, image: "" });
      const user = await UserModel.findOne({ email: body.email });
      expect(response.status).toBe(201);
      expect(response.body).toStrictEqual(expect.any(String));
      expect(user).toBeDefined();
    });
    it("should fail when email already exist", async () => {
      await UserModel.create({ ...body });
      const response = await request(app)
        .post(path)
        .send({ ...body });
      expect(response.status).toBe(409);
      expect(response.body).toStrictEqual({ message: "User already exist" });
    });
    it("should fail when validateSync fails body validation of name", async () => {
      const expectedErr = { message: ["Name is required"] };
      const response = await request(app)
        .post(path)
        .send({ ...body, name: "" });
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual(expectedErr);
    });
    it("should fail when validateSync fails body validation of email", async () => {
      const expectedErr = { message: ["Email is required"] };
      const response = await request(app)
        .post(path)
        .send({ ...body, email: "" });
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual(expectedErr);
    });
    it("should fail when validateSync fails body validation of password", async () => {
      const expectedErr = { message: ["Password is required"] };
      const response = await request(app)
        .post(path)
        .send({ ...body, password: "" });
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual(expectedErr);
    });
  });

  describe("loginUser", () => {
    const body: CredentialsModel = {
      email: "test@example.com",
      password: "somePassword",
    };

    const unAuthEmail = "test2@example.com";
    const unAuthPassword = "unAuthPassword";
    const path = `${baseUrl}/login`;

    it("should respond with an error when email is nullish", async () => {
      const expectedErr = { message: "Email or password were not provided" };
      const response = await request(app)
        .post(path)
        .send({ ...body, email: "" });
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual(expectedErr);
    });
    it("should respond withan error when password is nullish", async () => {
      const expectedErr = { message: "Email or password were not provided" };
      const response = await request(app)
        .post(path)
        .send({ ...body, password: "" });
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual(expectedErr);
    });
    it("should respond with an error when user not found", async () => {
      const expectedErr = { message: "Email or password are incorrect" };
      const response = await request(app)
        .post(path)
        .send({ ...body, email: unAuthEmail });
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual(expectedErr);
    });
    it("should should respond with an error when password is invalid", async () => {
      await UserModel.create({
        name: "ariel",
        email: body.email,
        password: body.password,
      });
      const expectedErr = { message: "Email or password are incorrect" };
      const response = await request(app)
        .post(path)
        .send({ ...body, password: unAuthPassword });
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual(expectedErr);
    });
    it("should respond with jwt token when verified successfuly", async () => {
      await UserModel.create({
        name: "ariel",
        email: body.email,
        password: body.password,
      });
      const response = await request(app)
        .post(path)
        .send({ ...body });
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual(expect.any(String));
    });
  });
});
