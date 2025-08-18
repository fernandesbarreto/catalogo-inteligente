import { CreateUser } from "../../src/use-cases/users/CreateUser";
import { makeRepo } from "./_mocks";
describe("CreateUser use case", () => {
  it("Should create user with valid email and password", async () => {
    const repo = makeRepo();
    const useCase = new CreateUser(repo as any);

    // o repo deve retornar só os campos públicos
    repo.create.mockResolvedValue({ id: "u1", email: "test@example.com" });

    const result = await useCase.exec({
      email: "test@example.com",
      password: "secret123",
    });

    expect(result).toEqual({ id: "u1", email: "test@example.com" });
    // o use case deve ter enviado passwordHash (não password) para o repo
    expect(repo.create).toHaveBeenCalledWith({
      email: "test@example.com",
      passwordHash: expect.any(String), // hash é não-determinístico
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
