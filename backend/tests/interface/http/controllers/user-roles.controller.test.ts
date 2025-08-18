import { Request, Response } from "express";
import { makeUserRolesController } from "../../../../src/interface/http/bff/controllers/user-roles.controller";

describe("UserRolesController", () => {
  let controller: any;
  let mockRepo: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRepo = {
      findRoles: jest.fn(),
      addRole: jest.fn(),
      removeRole: jest.fn(),
    };
    controller = makeUserRolesController(mockRepo);

    mockRequest = {
      params: { id: "user123" },
      body: {},
    };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };
  });

  describe("list", () => {
    it("Should return user roles", async () => {
      const roles = ["ADMIN", "EDITOR"];
      mockRepo.findRoles.mockResolvedValue(roles);

      await controller.list(mockRequest as Request, mockResponse as Response);

      expect(mockRepo.findRoles).toHaveBeenCalledWith("user123");
      expect(mockResponse.json).toHaveBeenCalledWith({
        userId: "user123",
        roles: ["ADMIN", "EDITOR"],
      });
    });

    it("Should return empty roles array", async () => {
      mockRepo.findRoles.mockResolvedValue([]);

      await controller.list(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        userId: "user123",
        roles: [],
      });
    });
  });

  describe("add", () => {
    it("Should add valid role", async () => {
      mockRequest.body = { role: "ADMIN" };
      mockRepo.addRole.mockResolvedValue(undefined);

      await controller.add(mockRequest as Request, mockResponse as Response);

      expect(mockRepo.addRole).toHaveBeenCalledWith("user123", "ADMIN");
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it("Should add EDITOR role", async () => {
      mockRequest.body = { role: "EDITOR" };
      mockRepo.addRole.mockResolvedValue(undefined);

      await controller.add(mockRequest as Request, mockResponse as Response);

      expect(mockRepo.addRole).toHaveBeenCalledWith("user123", "EDITOR");
    });

    it("Should add VIEWER role", async () => {
      mockRequest.body = { role: "VIEWER" };
      mockRepo.addRole.mockResolvedValue(undefined);

      await controller.add(mockRequest as Request, mockResponse as Response);

      expect(mockRepo.addRole).toHaveBeenCalledWith("user123", "VIEWER");
    });

    it("Should reject invalid role", async () => {
      mockRequest.body = { role: "INVALID" };

      await expect(
        controller.add(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow();
    });
  });

  describe("remove", () => {
    it("Should remove role", async () => {
      mockRequest.params = { id: "user123", role: "ADMIN" };
      mockRepo.removeRole.mockResolvedValue(undefined);

      await controller.remove(mockRequest as Request, mockResponse as Response);

      expect(mockRepo.removeRole).toHaveBeenCalledWith("user123", "ADMIN");
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it("Should remove any role name", async () => {
      mockRequest.params = { id: "user123", role: "CUSTOM_ROLE" };
      mockRepo.removeRole.mockResolvedValue(undefined);

      await controller.remove(mockRequest as Request, mockResponse as Response);

      expect(mockRepo.removeRole).toHaveBeenCalledWith(
        "user123",
        "CUSTOM_ROLE"
      );
    });
  });
});
