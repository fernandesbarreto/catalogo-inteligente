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
}
