import { Request, Response, NextFunction } from "express";
import { requireRole } from "../../../../src/interface/http/middlewares/requireRole";

describe("requireRole middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      roles: [],
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe("Single role requirement", () => {
    it("Should allow access when user has required role", () => {
      mockRequest.roles = ["ADMIN"];
      const middleware = requireRole("ADMIN");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("Should deny access when user lacks required role", () => {
      mockRequest.roles = ["VIEWER"];
      const middleware = requireRole("ADMIN");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "forbidden",
        needAnyOf: ["ADMIN"],
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("Should deny access when user has no roles", () => {
      mockRequest.roles = [];
      const middleware = requireRole("ADMIN");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "forbidden",
        needAnyOf: ["ADMIN"],
      });
    });
  });

  describe("Multiple role requirements", () => {
    it("Should allow access when user has any of the required roles", () => {
      mockRequest.roles = ["EDITOR"];
      const middleware = requireRole("ADMIN", "EDITOR");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("Should allow access when user has first required role", () => {
      mockRequest.roles = ["ADMIN"];
      const middleware = requireRole("ADMIN", "EDITOR");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("Should allow access when user has second required role", () => {
      mockRequest.roles = ["EDITOR"];
      const middleware = requireRole("ADMIN", "EDITOR");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("Should deny access when user has none of the required roles", () => {
      mockRequest.roles = ["VIEWER"];
      const middleware = requireRole("ADMIN", "EDITOR");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "forbidden",
        needAnyOf: ["ADMIN", "EDITOR"],
      });
    });
  });

  describe("Edge cases", () => {
    it("Should handle undefined roles", () => {
      mockRequest.roles = undefined;
      const middleware = requireRole("ADMIN");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "forbidden",
        needAnyOf: ["ADMIN"],
      });
    });

    it("Should handle null roles", () => {
      mockRequest.roles = null as any;
      const middleware = requireRole("ADMIN");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it("Should work with case-sensitive role names", () => {
      mockRequest.roles = ["admin"]; // lowercase
      const middleware = requireRole("ADMIN"); // uppercase

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe("Role combinations", () => {
    it("Should work with three required roles", () => {
      mockRequest.roles = ["EDITOR"];
      const middleware = requireRole("ADMIN", "EDITOR", "VIEWER");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("Should deny when user has different roles", () => {
      mockRequest.roles = ["MODERATOR", "SUPPORT"];
      const middleware = requireRole("ADMIN", "EDITOR", "VIEWER");

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });
});
