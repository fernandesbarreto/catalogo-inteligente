import { CreateUser } from "../../src/use-cases/users/CreateUser";
import { makeRepo } from "./_mocks";
describe("CreateUser use case", () => {
  it("Should create user with valid email and password", async () => {
    const repo = makeRepo();
    const useCase = new CreateUser(repo as any);

    // the repo should return only public fields
    repo.create.mockResolvedValue({ id: "u1", email: "test@example.com" });

    const result = await useCase.exec({
      email: "test@example.com",
      password: "secret123",
    });

    expect(result).toEqual({ id: "u1", email: "test@example.com" });
    // the use case should have sent passwordHash (not password) to the repo
    expect(repo.create).toHaveBeenCalledWith({
      email: "test@example.com",
      passwordHash: expect.any(String), // hash is non-deterministic
    });
  });

  it("Should fail if email is missing", async () => {
    const repo = makeRepo();
    const useCase = new CreateUser(repo as any);

    await expect(
      useCase.exec({ email: "", password: "abc123" })
    ).rejects.toThrow(/invalid email/i);
  });

  it("Should fail if password is less than 6 characters", async () => {
    const repo = makeRepo();
    const useCase = new CreateUser(repo as any);

    await expect(
      useCase.exec({ email: "ok@example.com", password: "123" })
    ).rejects.toThrow(/password/i);
  });
});
