// Mock environment variables before any imports
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_EXPIRES_IN = "1h";

// Now import after setting env vars
import { Login } from "../../src/use-cases/auth/login";
import { makeRepo } from "../users/_mocks";
import bcrypt from "bcryptjs";

describe("Login use case", () => {
  it("Should login with valid credentials", async () => {
    const repo = makeRepo();
    const password = "secret123";
    const passwordHash = await bcrypt.hash(password, 10);

    repo.findByEmail.mockResolvedValue({
      id: "u1",
      email: "test@example.com",
      passwordHash,
    });

    const useCase = new Login(repo as any);
    const result = await useCase.exec({
      email: "test@example.com",
      password: "secret123",
    });

    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("user");
    expect(result.user).toEqual({
      id: "u1",
      email: "test@example.com",
    });
    expect(repo.findByEmail).toHaveBeenCalledWith("test@example.com");
  });

  it("Should fail with invalid email", async () => {
    const repo = makeRepo();
    repo.findByEmail.mockResolvedValue(null);

    const useCase = new Login(repo as any);

    await expect(
      useCase.exec({ email: "invalid@example.com", password: "secret123" })
    ).rejects.toThrow("Unauthorized");
  });

  it("Should fail with wrong password", async () => {
    const repo = makeRepo();
    const passwordHash = await bcrypt.hash("correct123", 10);

    repo.findByEmail.mockResolvedValue({
      id: "u1",
      email: "test@example.com",
      passwordHash,
    });

    const useCase = new Login(repo as any);

    await expect(
      useCase.exec({ email: "test@example.com", password: "wrong123" })
    ).rejects.toThrow("Unauthorized");
  });

  it("Should fail with missing email", async () => {
    const repo = makeRepo();
    const useCase = new Login(repo as any);

    await expect(
      useCase.exec({ email: "", password: "secret123" })
    ).rejects.toThrow("Invalid credentials");
  });

  it("Should fail with missing password", async () => {
    const repo = makeRepo();
    const useCase = new Login(repo as any);

    await expect(
      useCase.exec({ email: "test@example.com", password: "" })
    ).rejects.toThrow("Invalid credentials");
  });
});
