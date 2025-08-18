import jwt from "jsonwebtoken";

// Mock environment variables before any imports
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_EXPIRES_IN = "1h";

// Now import after setting env vars
import {
  signAccessToken,
  verifyAccessToken,
  JwtPayload,
} from "../../../src/infra/auth/jwt";

describe("JWT utilities", () => {
  it("Should sign and verify access token", () => {
    const payload: JwtPayload = {
      sub: "user123",
      email: "test@example.com",
    };

    const token = signAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    const verified = verifyAccessToken(token);
    expect(verified.sub).toBe(payload.sub);
    expect(verified.email).toBe(payload.email);
    expect(verified).toHaveProperty("exp");
    expect(verified).toHaveProperty("iat");
  });

  it("Should fail to verify invalid token", () => {
    expect(() => {
      verifyAccessToken("invalid-token");
    }).toThrow();
  });
});
