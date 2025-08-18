import { UserRepoPrisma } from "../../src/infra/db/repositories/UserRepoPrisma";

describe("UserRepoPrisma RBAC", () => {
  let repo: UserRepoPrisma;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      userRole: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
    };
    repo = new UserRepoPrisma(mockPrisma);
  });

  describe("findRoles", () => {
    it("Should return user roles", async () => {
      const userId = "user123";
      const mockRoles = [
        { role: { name: "admin" } },
        { role: { name: "user" } },
      ];

      mockPrisma.userRole.findMany.mockResolvedValue(mockRoles);

      const result = await repo.findRoles(userId);

      expect(result).toEqual(["admin", "user"]);
      expect(mockPrisma.userRole.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { role: true },
      });
    });

    it("Should return empty array when user has no roles", async () => {
      const userId = "user123";
      mockPrisma.userRole.findMany.mockResolvedValue([]);

      const result = await repo.findRoles(userId);

      expect(result).toEqual([]);
      expect(mockPrisma.userRole.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { role: true },
      });
    });
  });

  describe("addRole", () => {
    it("Should add role to user", async () => {
      const userId = "user123";
      const roleName = "admin";
      const mockRole = { id: "role123", name: "admin" };

      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      mockPrisma.userRole.upsert.mockResolvedValue({});

      await repo.addRole(userId, roleName);

      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: roleName },
      });
      expect(mockPrisma.userRole.upsert).toHaveBeenCalledWith({
        where: { userId_roleId: { userId, roleId: mockRole.id } },
        update: {},
        create: { userId, roleId: mockRole.id },
      });
    });

    it("Should throw error when role not found", async () => {
      const userId = "user123";
      const roleName = "nonexistent";

      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(repo.addRole(userId, roleName)).rejects.toThrow(
        "role_not_found"
      );
      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: roleName },
      });
      expect(mockPrisma.userRole.upsert).not.toHaveBeenCalled();
    });

    it("Should handle duplicate role assignment gracefully", async () => {
      const userId = "user123";
      const roleName = "admin";
      const mockRole = { id: "role123", name: "admin" };

      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      mockPrisma.userRole.upsert.mockResolvedValue({});

      // Should not throw when adding the same role again
      await repo.addRole(userId, roleName);
      await repo.addRole(userId, roleName);

      expect(mockPrisma.userRole.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe("removeRole", () => {
    it("Should remove role from user", async () => {
      const userId = "user123";
      const roleName = "admin";
      const mockRole = { id: "role123", name: "admin" };

      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 1 });

      await repo.removeRole(userId, roleName);

      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: roleName },
      });
      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId, roleId: mockRole.id },
      });
    });

    it("Should handle removing non-existent role gracefully", async () => {
      const userId = "user123";
      const roleName = "nonexistent";

      mockPrisma.role.findUnique.mockResolvedValue(null);

      // Should not throw when removing non-existent role
      await expect(repo.removeRole(userId, roleName)).resolves.toBeUndefined();
      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: roleName },
      });
      expect(mockPrisma.userRole.deleteMany).not.toHaveBeenCalled();
    });

    it("Should handle removing role that user doesn't have", async () => {
      const userId = "user123";
      const roleName = "admin";
      const mockRole = { id: "role123", name: "admin" };

      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 0 });

      // Should not throw when removing role user doesn't have
      await expect(repo.removeRole(userId, roleName)).resolves.toBeUndefined();
      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId, roleId: mockRole.id },
      });
    });
  });

  describe("RBAC Integration", () => {
    it("Should handle full role lifecycle", async () => {
      const userId = "user123";
      const roleName = "moderator";
      const mockRole = { id: "role456", name: "moderator" };

      // Find roles (initially empty)
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      let roles = await repo.findRoles(userId);
      expect(roles).toEqual([]);

      // Add role
      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      mockPrisma.userRole.upsert.mockResolvedValue({});
      await repo.addRole(userId, roleName);

      // Find roles (now has the role)
      mockPrisma.userRole.findMany.mockResolvedValue([
        { role: { name: "moderator" } },
      ]);
      roles = await repo.findRoles(userId);
      expect(roles).toEqual(["moderator"]);

      // Remove role
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 1 });
      await repo.removeRole(userId, roleName);

      // Find roles (back to empty)
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      roles = await repo.findRoles(userId);
      expect(roles).toEqual([]);
    });
  });
});
