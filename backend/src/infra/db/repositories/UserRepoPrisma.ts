import { PrismaClient } from "@prisma/client";
import {
  IUserRepo,
  CreateUserDTO,
  UpdateUserDTO,
} from "../../../domain/repositories/IUserRepo";

export class UserRepoPrisma implements IUserRepo {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateUserDTO) {
    const u = await this.prisma.user.create({
      data: { email: data.email, password: data.passwordHash },
    });
    return { id: u.id, email: u.email };
  }

  async findById(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    return u ? { id: u.id, email: u.email } : null;
  }

  async findByEmail(email: string) {
    const u = await this.prisma.user.findUnique({ where: { email } });
    return u ? { id: u.id, email: u.email, passwordHash: u.password } : null;
  }

  async list(skip: number, take: number) {
    const us = await this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
    return us.map((u) => ({ id: u.id, email: u.email }));
  }

  async update(id: string, data: UpdateUserDTO) {
    const u = await this.prisma.user.update({
      where: { id },
      data: { email: data.email, password: data.passwordHash },
    });
    return { id: u.id, email: u.email };
  }

  async delete(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }

  async findRoles(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return rows.map((r) => r.role.name);
  }

  async addRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role)
      throw Object.assign(new Error("role_not_found"), { status: 404 });
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  }

  async removeRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) return; // idempotente
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId: role.id },
    });
  }
}
