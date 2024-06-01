import { IUserModel } from "../../src/models/UserModel";
import { createJWT } from "../../src/utils/createJWT";

process.env.JWT_SECRET = "secret";

describe("createJWT", () => {
  it("should return string when jwt created", () => {
    const jwt = createJWT({
      _id: "id",
      name: "name",
      email: "email",
      image: "image",
    } as IUserModel);
    expect(jwt).toEqual(expect.any(String));
  });
});
