import { Request, Response, NextFunction } from "express";

// Mock environment variables before any imports
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_EXPIRES_IN = "1h";

// Now import after setting env vars
import { requireAuth } from "../../../../src/interface/http/middlewares/requireAuth";
import { signAccessToken } from "../../../../src/infra/auth/jwt";

describe("requireAuth middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it("Should call next() with valid token", () => {
    const token = signAccessToken({
      sub: "user123",
      email: "test@example.com",
    });
    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toEqual({
      id: "user123",
      email: "test@example.com",
    });
  });

  it("Should return 401 when no authorization header", () => {
    mockRequest.headers = {};

    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "missing_token" });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("Should return 401 when no token in header", () => {
    mockRequest.headers = {
      authorization: "Bearer ",
    };

    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "missing_token" });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("Should return 401 with invalid token", () => {
    mockRequest.headers = {
      authorization: "Bearer invalid-token",
    };

    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "invalid_token" });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
