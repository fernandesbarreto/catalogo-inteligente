import { UpdateUser } from "../../src/use-cases/users/UpdateUser";
import { makeRepo } from "./_mocks";

jest.mock("bcryptjs", () => ({ hash: jest.fn(async () => "HASHED") }));

describe("UpdateUser", () => {
  it("Should update email and password (generates hash)", async () => {
    const repo = makeRepo();
    repo.update.mockResolvedValue({ id: "u1", email: "new@example.com" });

    const uc = new UpdateUser(repo as any);
    const out = await uc.exec("u1", {
      email: "new@example.com",
      password: "abc123",
    });

    expect(out).toEqual({ id: "u1", email: "new@example.com" });
    expect(repo.update).toHaveBeenCalledWith("u1", {
      email: "new@example.com",
      passwordHash: "HASHED",
    });
  });

  it("Should not send passwordHash if password is not provided", async () => {
    const repo = makeRepo();
    repo.update.mockResolvedValue({ id: "u1", email: "n2@example.com" });

    const uc = new UpdateUser(repo as any);
    await uc.exec("u1", { email: "n2@example.com" });

    expect(repo.update).toHaveBeenCalledWith("u1", {
      email: "n2@example.com",
      passwordHash: undefined,
    });
  });
});
